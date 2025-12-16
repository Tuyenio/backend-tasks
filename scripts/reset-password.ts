import { config } from 'dotenv'
import * as path from 'path'
import * as bcrypt from 'bcrypt'
import { Client } from 'pg'

config({ path: path.join(__dirname, '../.env') })

async function resetPassword() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    await client.connect()
    
    const newPassword = '123456'
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    console.log('🔐 Resetting password for tt98tuyen@gmail.com...\n')
    
    const result = await client.query(`
      UPDATE users 
      SET password = $1
      WHERE email = $2
      RETURNING email, id
    `, [hashedPassword, 'tt98tuyen@gmail.com'])

    if (result.rows.length > 0) {
      console.log('✅ Password reset successfully!')
      console.log(`\n📋 User Information:`)
      console.log(`   - Email: ${result.rows[0].email}`)
      console.log(`   - ID: ${result.rows[0].id}`)
      console.log(`\n🔑 New Password: ${newPassword}`)
      console.log(`🔒 Hash: ${hashedPassword.substring(0, 30)}...`)
    } else {
      console.log('❌ User not found!')
    }

    await client.end()
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

resetPassword()
