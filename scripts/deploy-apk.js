const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const sourceApk = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const targetApkRoot = path.join(rootDir, 'public', 'moveman.apk');
const targetApkDownloads = path.join(rootDir, 'public', 'downloads', 'moveman.apk');
const appReleasePath = path.join(rootDir, 'src', 'lib', 'appRelease.ts');

console.log('====================================================');
console.log('🚀 MOVEMAN 안드로이드 APK 자동 덮어쓰기 & Render 배포');
console.log('====================================================\n');

// 1. 빌드된 원본 APK 확인
if (!fs.existsSync(sourceApk)) {
  console.error('❌ 빌드된 APK 파일을 찾을 수 없습니다.');
  console.error(`   경로: ${sourceApk}`);
  console.error('👉 Android Studio에서 [Build] -> [Build Bundle(s) / APK(s)] -> [Build APK(s)]를 먼저 실행해 주세요.\n');
  process.exit(1);
}

const apkStats = fs.statSync(sourceApk);
const sizeMb = (apkStats.size / (1024 * 1024)).toFixed(1);

// 현재 한국 시간 계산 (yyyy-MM-dd HH:mm)
const now = new Date();
const kstOffset = 9 * 60 * 60 * 1000;
const kstDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + kstOffset);
const pad = (n) => String(n).padStart(2, '0');
const releaseDateStr = `${kstDate.getFullYear()}-${pad(kstDate.getMonth() + 1)}-${pad(kstDate.getDate())} ${pad(kstDate.getHours())}:${pad(kstDate.getMinutes())}`;

console.log(`📦 원본 APK 확인 완료:`);
console.log(`   - 파일 크기: ${sizeMb} MB`);
console.log(`   - 릴리즈 일시: ${releaseDateStr}\n`);

// 2. public/downloads 디렉토리 확인 및 생성
const downloadsDir = path.join(rootDir, 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// 2-1. 안드로이드 assets 디렉토리에 복사된 중복 APK 정리 (용량 비대화 방지)
const assetsPublicDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');
const nestedApk1 = path.join(assetsPublicDir, 'moveman.apk');
const nestedApk2 = path.join(assetsPublicDir, 'downloads', 'moveman.apk');
if (fs.existsSync(nestedApk1)) fs.unlinkSync(nestedApk1);
if (fs.existsSync(nestedApk2)) fs.unlinkSync(nestedApk2);

// 3. 최신 APK 파일 덮어쓰기 복사
console.log('🔄 최신 moveman.apk 파일 덮어쓰기 복사 중...');
fs.copyFileSync(sourceApk, targetApkRoot);
fs.copyFileSync(sourceApk, targetApkDownloads);
console.log(`   ✓ ${targetApkRoot} 덮어쓰기 완료`);
console.log(`   ✓ ${targetApkDownloads} 덮어쓰기 완료\n`);

// 4. 기존 버전 정보 읽어서 패치 버전 자동 증가 (예: v1.0.1 -> v1.0.2)
let currentVersion = 'v1.0.1';
if (fs.existsSync(appReleasePath)) {
  const content = fs.readFileSync(appReleasePath, 'utf8');
  const match = content.match(/version:\s*['"](v\d+\.\d+\.)(\d+)['"]/);
  if (match) {
    const prefix = match[1];
    const patchNum = parseInt(match[2], 10) + 1;
    currentVersion = `${prefix}${patchNum}`;
  }
}

// 5. src/lib/appRelease.ts 갱신
const newReleaseContent = `/**
 * 안드로이드 모바일 앱 릴리즈 정보 메타데이터 (자동 갱신됨)
 */
export const APP_RELEASE_INFO = {
  version: '${currentVersion}',
  releaseDate: '${releaseDateStr}',
  fileSize: '${sizeMb} MB',
  fileName: 'moveman.apk',
  note: '최신 안드로이드 네이티브 빌드 자동 배포'
}
`;

fs.writeFileSync(appReleasePath, newReleaseContent, 'utf8');
console.log(`📝 appRelease.ts 메타데이터 갱신 완료:`);
console.log(`   - 버전: ${currentVersion}`);
console.log(`   - 일시: ${releaseDateStr}\n`);

// 6. Git commit & push 자동 실행
try {
  console.log('📤 Git 스테이징 및 커밋 생성 중...');
  execSync('git add public/moveman.apk public/downloads/moveman.apk src/lib/appRelease.ts', { cwd: rootDir, stdio: 'inherit' });
  
  const commitMsg = `chore(release): moveman.apk 최신 빌드 배포 (${currentVersion}, ${releaseDateStr})`;
  execSync(`git commit -m "${commitMsg}"`, { cwd: rootDir, stdio: 'inherit' });

  console.log('\n🚀 GitHub main 브랜치로 푸시하여 Render 배포 시작 중...');
  execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });

  console.log('\n====================================================');
  console.log(`🎉 배포 성공! Render에서 약 1~2분 후 자동 배포가 완료됩니다.`);
  console.log(`📱 다운로드 링크: https://move-man.onrender.com/moveman.apk`);
  console.log(`🔐 로그인 화면: https://move-man.onrender.com/login`);
  console.log('====================================================\n');
} catch (gitErr) {
  console.error('\n⚠️ Git 커밋/푸시 중 오류가 발생했습니다:', gitErr.message);
  process.exit(1);
}
