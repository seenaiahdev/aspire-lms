const fs = require('fs');
const src = 'C:/Users/Seenaiah/.gemini/antigravity/brain/67992cba-db46-474a-b91c-7626944b0fc1/.tempmediaStorage/media_1786109472875.jpg';
const dest = 'C:/Users/Seenaiah/Downloads/lms/project/src/assests/aspire_backpack.jpg';
fs.copyFileSync(src, dest);
console.log('✅ Copied! Size:', fs.statSync(dest).size, 'bytes');
