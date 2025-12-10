import * as fs from 'fs';
import * as path from 'path';

interface ModuleAnalysis {
  name: string;
  hasController: boolean;
  hasService: boolean;
  hasModule: boolean;
  hasDto: boolean;
  hasEntity: boolean;
  hasGuards: boolean;
  endpoints: string[];
  permissions: string[];
}

function analyzeBackend() {
  console.log('=== BACKEND ANALYSIS ===\n');
  
  const modulesPath = path.join(__dirname, '../src/modules');
  const modules = fs.readdirSync(modulesPath);
  
  const analysis: ModuleAnalysis[] = [];
  
  for (const moduleName of modules) {
    const modulePath = path.join(modulesPath, moduleName);
    if (!fs.statSync(modulePath).isDirectory()) continue;
    
    const moduleFiles = fs.readdirSync(modulePath);
    
    const moduleInfo: ModuleAnalysis = {
      name: moduleName,
      hasController: moduleFiles.some(f => f.includes('.controller.ts')),
      hasService: moduleFiles.some(f => f.includes('.service.ts')),
      hasModule: moduleFiles.some(f => f.includes('.module.ts')),
      hasDto: moduleFiles.some(f => f.includes('dto')),
      hasEntity: false,
      hasGuards: moduleFiles.some(f => f.includes('guard')),
      endpoints: [],
      permissions: []
    };
    
    // Read controller to get endpoints and permissions
    const controllerFile = moduleFiles.find(f => f.includes('.controller.ts'));
    if (controllerFile) {
      const controllerPath = path.join(modulePath, controllerFile);
      const content = fs.readFileSync(controllerPath, 'utf-8');
      
      // Extract endpoints (simplified)
      const getMatches = content.match(/@Get\(['"](.*?)['"]\)/g) || [];
      const postMatches = content.match(/@Post\(['"](.*?)['"]\)/g) || [];
      const patchMatches = content.match(/@Patch\(['"](.*?)['"]\)/g) || [];
      const deleteMatches = content.match(/@Delete\(['"](.*?)['"]\)/g) || [];
      
      moduleInfo.endpoints = [
        ...getMatches.map(m => 'GET ' + m.match(/['"](.*?)['"]/)?.[1]),
        ...postMatches.map(m => 'POST ' + m.match(/['"](.*?)['"]/)?.[1]),
        ...patchMatches.map(m => 'PATCH ' + m.match(/['"](.*?)['"]/)?.[1]),
        ...deleteMatches.map(m => 'DELETE ' + m.match(/['"](.*?)['"]/)?.[1])
      ].filter(Boolean);
      
      // Extract permissions
      const permMatches = content.match(/@RequirePermissions\(['"](.*?)['"]\)/g) || [];
      moduleInfo.permissions = permMatches.map(m => m.match(/['"](.*?)['"]/)?.[1]).filter(Boolean) as string[];
    }
    
    analysis.push(moduleInfo);
  }
  
  // Print analysis
  console.log('📊 MODULES OVERVIEW:\n');
  analysis.forEach(module => {
    const status = module.hasController && module.hasService && module.hasModule ? '✅' : '⚠️';
    console.log(`${status} ${module.name.toUpperCase()}`);
    console.log(`   Controller: ${module.hasController ? '✓' : '✗'}`);
    console.log(`   Service: ${module.hasService ? '✓' : '✗'}`);
    console.log(`   Module: ${module.hasModule ? '✓' : '✗'}`);
    console.log(`   DTOs: ${module.hasDto ? '✓' : '✗'}`);
    console.log(`   Endpoints: ${module.endpoints.length}`);
    console.log(`   Permissions: ${module.permissions.length > 0 ? module.permissions.join(', ') : 'None'}`);
    console.log('');
  });
  
  // Summary
  const complete = analysis.filter(m => m.hasController && m.hasService && m.hasModule).length;
  console.log(`\n📈 SUMMARY: ${complete}/${analysis.length} modules complete`);
  
  // Permission coverage
  const modulesWithPermissions = analysis.filter(m => m.permissions.length > 0).length;
  console.log(`🔒 Permission Coverage: ${modulesWithPermissions}/${analysis.length} modules protected`);
  
  return analysis;
}

function analyzeFrontend() {
  console.log('\n\n=== FRONTEND ANALYSIS ===\n');
  
  const appPath = path.join(__dirname, '../../frontend-tasks/src/app/(main)');
  
  if (!fs.existsSync(appPath)) {
    console.log('❌ Frontend path not found');
    return;
  }
  
  const pages = fs.readdirSync(appPath).filter(f => {
    const fullPath = path.join(appPath, f);
    return fs.statSync(fullPath).isDirectory();
  });
  
  console.log('📄 PAGES:\n');
  
  pages.forEach(page => {
    const pagePath = path.join(appPath, page);
    const pageFiles = fs.readdirSync(pagePath);
    
    const hasPageFile = pageFiles.some(f => f === 'page.tsx');
    const hasLayoutFile = pageFiles.some(f => f === 'layout.tsx');
    
    console.log(`${hasPageFile ? '✅' : '⚠️'} ${page}`);
    console.log(`   page.tsx: ${hasPageFile ? '✓' : '✗'}`);
    console.log(`   layout.tsx: ${hasLayoutFile ? '✓' : '✗'}`);
    
    // Check for permission usage
    if (hasPageFile) {
      const pageContent = fs.readFileSync(path.join(pagePath, 'page.tsx'), 'utf-8');
      const usesPermission = pageContent.includes('usePermission') || 
                            pageContent.includes('hasPermission') ||
                            pageContent.includes('can(');
      const usesAuth = pageContent.includes('useAuthStore');
      
      console.log(`   Uses Permission: ${usesPermission ? '✓' : '✗'}`);
      console.log(`   Uses Auth: ${usesAuth ? '✓' : '✗'}`);
    }
    console.log('');
  });
  
  console.log(`📈 SUMMARY: ${pages.length} pages found`);
}

function analyzePermissionSystem() {
  console.log('\n\n=== PERMISSION SYSTEM ANALYSIS ===\n');
  
  // Check backend guard
  const guardPath = path.join(__dirname, '../src/common/guards/permissions.guard.ts');
  const guardExists = fs.existsSync(guardPath);
  console.log(`Backend PermissionsGuard: ${guardExists ? '✅' : '❌'}`);
  
  // Check decorator
  const decoratorPath = path.join(__dirname, '../src/common/decorators/permissions.decorator.ts');
  const decoratorExists = fs.existsSync(decoratorPath);
  console.log(`@RequirePermissions Decorator: ${decoratorExists ? '✅' : '❌'}`);
  
  // Check frontend hook
  const hookPath = path.join(__dirname, '../../frontend-tasks/src/hooks/use-permission.ts');
  const hookExists = fs.existsSync(hookPath);
  console.log(`Frontend usePermission Hook: ${hookExists ? '✅' : '❌'}`);
  
  // Check auth store
  const authStorePath = path.join(__dirname, '../../frontend-tasks/src/stores/auth-store.ts');
  const authStoreExists = fs.existsSync(authStorePath);
  console.log(`Auth Store with Permissions: ${authStoreExists ? '✅' : '❌'}`);
  
  if (guardExists) {
    const guardContent = fs.readFileSync(guardPath, 'utf-8');
    const hasSuperAdminCheck = guardContent.includes('super_admin');
    const hasRoleAggregation = guardContent.includes('aggregateUserPermissions');
    
    console.log('\n🔍 Guard Features:');
    console.log(`   Super Admin Bypass: ${hasSuperAdminCheck ? '✓' : '✗'}`);
    console.log(`   Role Permission Aggregation: ${hasRoleAggregation ? '✓' : '✗'}`);
  }
  
  if (hookExists) {
    const hookContent = fs.readFileSync(hookPath, 'utf-8');
    const hasCanFunction = hookContent.includes('const can =');
    const hasRoleChecks = hookContent.includes('isSuperAdmin') && hookContent.includes('isAdmin');
    
    console.log('\n🔍 Frontend Hook Features:');
    console.log(`   can() function: ${hasCanFunction ? '✓' : '✗'}`);
    console.log(`   Role helper functions: ${hasRoleChecks ? '✓' : '✗'}`);
  }
}

function generateRecommendations(backendModules: ModuleAnalysis[]) {
  console.log('\n\n=== RECOMMENDATIONS ===\n');
  
  const recommendations: string[] = [];
  
  // Check modules without permissions
  const unprotectedModules = backendModules.filter(m => 
    m.hasController && m.permissions.length === 0
  );
  
  if (unprotectedModules.length > 0) {
    recommendations.push(`⚠️  ${unprotectedModules.length} modules without permission protection:`);
    unprotectedModules.forEach(m => {
      recommendations.push(`   - ${m.name}: Add @RequirePermissions() decorators`);
    });
  }
  
  // Check incomplete modules
  const incompleteModules = backendModules.filter(m => 
    !m.hasController || !m.hasService || !m.hasModule
  );
  
  if (incompleteModules.length > 0) {
    recommendations.push(`\n⚠️  ${incompleteModules.length} incomplete modules:`);
    incompleteModules.forEach(m => {
      const missing: string[] = [];
      if (!m.hasController) missing.push('controller');
      if (!m.hasService) missing.push('service');
      if (!m.hasModule) missing.push('module');
      recommendations.push(`   - ${m.name}: Missing ${missing.join(', ')}`);
    });
  }
  
  // General recommendations
  recommendations.push('\n✅ Action Items:');
  recommendations.push('   1. Add permission checks to all protected endpoints');
  recommendations.push('   2. Implement role-based UI rendering in frontend');
  recommendations.push('   3. Test permission system with all user roles');
  recommendations.push('   4. Add permission-based component visibility');
  recommendations.push('   5. Ensure frontend API calls handle 403 errors properly');
  
  recommendations.forEach(r => console.log(r));
}

// Main execution
console.log('🔍 PROJECT STATUS ANALYZER\n');
console.log('='.repeat(60));

const backendModules = analyzeBackend();
analyzeFrontend();
analyzePermissionSystem();
generateRecommendations(backendModules);

console.log('\n' + '='.repeat(60));
console.log('✅ Analysis Complete!');
