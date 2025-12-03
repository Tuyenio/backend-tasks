import dataSource from '../src/database/data-source';

async function runMigrations() {
  try {
    await dataSource.initialize();
    console.log('✅ Data Source initialized');

    await dataSource.runMigrations();
    console.log('✅ Migrations executed successfully');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
