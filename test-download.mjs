import youtubedl from 'youtube-dl-exec';
import fs from 'fs';
import path from 'path';

const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Outro vídeo para teste
const output = 'test-video.mp4';

console.log(`Starting download of YouTube video from ${youtubeUrl}...`);

youtubedl(youtubeUrl, {
  output: output,
  mergeOutputFormat: 'mp4'
})
  .then(() => {
    console.log(`Downloaded video to ${output}`);
    if (fs.existsSync(output)) {
      const stats = fs.statSync(output);
      console.log(`File size: ${stats.size} bytes`);
    } else {
      console.log(`File ${output} does not exist.`);
    }
  })
  .catch(error => {
    console.error(`Error downloading video: ${error.message}`);
  });

// Verificar a existência e o tamanho do arquivo periodicamente
const checkFileExists = setInterval(() => {
  if (fs.existsSync(output)) {
    const stats = fs.statSync(output);
    console.log(`File ${output} exists with size: ${stats.size} bytes`);
    clearInterval(checkFileExists);
  } else {
    console.log(`File ${output} does not exist yet.`);
  }
}, 1000);
