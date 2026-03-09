// Script to verify Prisma binaries are generated correctly
const fs = require('fs');
const path = require('path');

const prismaOutputPath = path.join(__dirname, '../app/generated/prisma');
const prismaPath = path.join(prismaOutputPath, '.prisma');

console.log('Checking Prisma binary location...');
console.log('Output path:', prismaOutputPath);
console.log('Binary path:', prismaPath);

if (fs.existsSync(prismaPath)) {
  const files = fs.readdirSync(prismaPath, { recursive: true });
  console.log('Found Prisma binaries:');
  files.forEach(file => {
    if (file.includes('query_engine') || file.includes('libquery_engine')) {
      console.log('  -', file);
    }
  });
} else {
  console.log('Prisma binary directory not found at:', prismaPath);
  console.log('Checking alternative locations...');
  
  // Check if binaries are in the output directory directly
  const outputFiles = fs.readdirSync(prismaOutputPath);
  const binaryFiles = outputFiles.filter(f => 
    f.includes('query_engine') || f.includes('libquery_engine')
  );
  
  if (binaryFiles.length > 0) {
    console.log('Found binaries in output directory:');
    binaryFiles.forEach(file => console.log('  -', file));
  } else {
    console.log('No binaries found in output directory');
  }
}

