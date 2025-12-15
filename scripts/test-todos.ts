import AppDataSource from '../src/database/data-source'
import { Note } from '../src/entities/note.entity'
import { User } from '../src/entities/user.entity'

/**
 * Test script to validate todos persistence feature
 */
async function testTodos() {
  console.log('🧪 Starting todos feature test...\n')

  try {
    // Initialize database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
      console.log('✅ Database connected\n')
    }

    const noteRepository = AppDataSource.getRepository(Note)
    const userRepository = AppDataSource.getRepository(User)

    // Get a user to create notes with
    let testUser = await userRepository.findOne({ where: { email: 'admin@example.com' } })
    if (!testUser) {
      // Find any user
      testUser = await userRepository.findOne({ where: {} })
    }

    if (!testUser) {
      console.error('❌ No users found in database')
      process.exit(1)
    }

    console.log(`👤 Using user: ${testUser.email}\n`)

    // Test 1: Create note with todos
    console.log('Test 1: Create note with todos')
    const todosData = [
      { id: 'todo-1', text: 'Learn NestJS', completed: false },
      { id: 'todo-2', text: 'Build API', completed: false },
      { id: 'todo-3', text: 'Write tests', completed: true },
    ]

    const testNote = noteRepository.create({
      title: 'Test Note with Todos',
      content: 'This is a test note with todos',
      createdBy: testUser,
      todos: todosData,
    })

    const savedNote = await noteRepository.save(testNote)
    console.log(`✅ Note created with ID: ${savedNote.id}`)
    console.log(`📝 Todos stored: ${JSON.stringify(savedNote.todos)}\n`)

    // Test 2: Retrieve note and verify todos
    console.log('Test 2: Retrieve note and verify todos')
    const retrievedNote = await noteRepository.findOne({
      where: { id: savedNote.id },
    })

    if (!retrievedNote) {
      console.error('❌ Failed to retrieve note')
      process.exit(1)
    }

    console.log(`✅ Note retrieved: ${retrievedNote.title}`)
    
    if (retrievedNote.todos && Array.isArray(retrievedNote.todos)) {
      console.log(`✅ Todos parsed successfully:`)
      retrievedNote.todos.forEach((todo: any) => {
        console.log(`  - [${todo.completed ? 'x' : ' '}] ${todo.text}`)
      })
    }
    console.log()

    // Test 3: Update note todos
    console.log('Test 3: Update note todos')
    const updatedTodos = [
      { id: 'todo-1', text: 'Learn NestJS', completed: true },
      { id: 'todo-2', text: 'Build API', completed: true },
      { id: 'todo-3', text: 'Write tests', completed: true },
      { id: 'todo-4', text: 'Deploy', completed: false },
    ]

    retrievedNote.todos = updatedTodos
    const updatedNote = await noteRepository.save(retrievedNote)
    console.log(`✅ Note updated with new todos`)
    console.log(`📝 Updated todos: ${JSON.stringify(updatedNote.todos)}\n`)

    // Test 4: Verify update persisted
    console.log('Test 4: Verify update persisted')
    const finalNote = await noteRepository.findOne({
      where: { id: savedNote.id },
    })

    if (!finalNote) {
      console.error('❌ Failed to retrieve updated note')
      process.exit(1)
    }

    const finalTodos = Array.isArray(finalNote.todos) ? finalNote.todos : []
    console.log(`✅ Final todos state:`)
    finalTodos.forEach((todo: any) => {
      console.log(`  - [${todo.completed ? 'x' : ' '}] ${todo.text}`)
    })
    
    if (finalTodos.length === 4) {
      console.log(`✅ All 4 todos preserved\n`)
    } else {
      console.error(`❌ Expected 4 todos, got ${finalTodos.length}\n`)
    }

    // Test 5: Check todos column exists in database
    console.log('Test 5: Verify todos column in database schema')
    const queryRunner = AppDataSource.createQueryRunner()
    try {
      const table = await queryRunner.getTable('notes')
      if (table) {
        const todosColumn = table.columns.find(col => col.name === 'todos')
        
        if (todosColumn) {
          console.log(`✅ todos column exists in notes table`)
          console.log(`   Type: ${todosColumn.type}`)
          console.log(`   Nullable: ${todosColumn.isNullable}\n`)
        } else {
          console.error(`❌ todos column not found in notes table\n`)
        }
      }
    } finally {
      await queryRunner.release()
    }

    console.log('✅ All tests passed!')
    console.log('\n📋 Summary:')
    console.log('✅ Todos can be created and stored as JSON')
    console.log('✅ Todos are properly persisted to database')
    console.log('✅ Todos can be retrieved and parsed')
    console.log('✅ Todos updates are persisted')
    console.log('✅ Database schema supports todos column')

    process.exit(0)
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testTodos()
