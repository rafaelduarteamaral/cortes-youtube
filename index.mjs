// Importa os módulos necessários
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';
import youtubedl from 'youtube-dl-exec';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Define __filename e __dirname para uso em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cria um cliente para o Google Cloud Video Intelligence
const client = new VideoIntelligenceServiceClient({
  keyFilename: 'cloud-google/savvy-celerity-349918-4d28740d6de7.json'
});

// Define os diretórios de download e corte
const downloadsDir = path.join(__dirname, 'downloads');
const cortesDir = path.join(__dirname, 'cortes');

// Cria os diretórios de download e corte, se não existirem
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

if (!fs.existsSync(cortesDir)) {
  fs.mkdirSync(cortesDir);
}

// Função para baixar o vídeo do YouTube
async function downloadYouTubeVideo(url, output) {
  return new Promise((resolve, reject) => {
    youtubedl(url, {
      output: output,
      mergeOutputFormat: 'mp4'
    }).then(() => {
      console.log(`Downloaded video to ${output}`);
      if (fs.existsSync(output)) {
        const stats = fs.statSync(output);
        console.log(`File size: ${stats.size} bytes`);
        resolve();
      } else {
        console.log(`File ${output} does not exist.`);
        reject(new Error(`File ${output} does not exist.`));
      }
    }).catch(error => {
      console.error(`Error downloading video: ${error.message}`);
      reject(error);
    });

    // Verifica periodicamente a existência do arquivo
    const checkFileExists = setInterval(() => {
      if (fs.existsSync(output)) {
        const stats = fs.statSync(output);
        console.log(`File ${output} exists with size: ${stats.size} bytes`);
        clearInterval(checkFileExists);
      } else {
        console.log(`File ${output} does not exist yet.`);
      }
    }, 1000);
  });
}

// Função para dividir o vídeo em partes
async function splitVideoIntoParts(videoPath, partDuration) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions('-c', 'copy', '-map', '0', '-segment_time', partDuration, '-f', 'segment')
      .output(path.join(downloadsDir, 'output%03d.mp4'))
      .on('end', resolve)
      .on('error', (err) => {
        console.error('Error splitting video:', err.message);
        reject(err);
      })
      .run();
  });
}

// Função para detectar cenas em uma parte do vídeo
async function detectScenesForPart(videoPath) {
  const fileData = fs.readFileSync(videoPath);
  const request = {
    inputContent: fileData.toString('base64'),
    features: ['SHOT_CHANGE_DETECTION'],
    videoContext: {
      shotChangeDetectionConfig: {
        model: 'builtin/latest'
      }
    }
  };

  try {
    const [operation] = await client.annotateVideo(request);
    const [operationResult] = await operation.promise();
    const shotChanges = operationResult.annotationResults[0].shotAnnotations;

    // Mapeia as mudanças de cena para tempos de início e fim em segundos
    return shotChanges.map(shot => {
      const startTimeSeconds = Number(shot.startTimeOffset?.seconds || 0);
      const startTimeNanos = Number(shot.startTimeOffset?.nanos || 0);
      const endTimeSeconds = Number(shot.endTimeOffset?.seconds || 0);
      const endTimeNanos = Number(shot.endTimeOffset?.nanos || 0);

      return {
        startTime: (startTimeSeconds + startTimeNanos * 1e-9).toFixed(3),
        endTime: (endTimeSeconds + endTimeNanos * 1e-9).toFixed(3)
      };
    });
  } catch (err) {
    console.error('Error detecting scenes:', err.message);
    throw err;
  }
}

// Função para detectar cenas em todo o vídeo, dividido em partes
async function detectScenes(videoPath) {
  const partDuration = 1800;
  await splitVideoIntoParts(videoPath, partDuration);

  const partFiles = fs.readdirSync(downloadsDir).filter(file => file.startsWith('output') && file.endsWith('.mp4'));
  const allScenes = [];

  for (const partFile of partFiles) {
    const partFilePath = path.join(downloadsDir, partFile);

    if (fs.existsSync(partFilePath) && fs.statSync(partFilePath).size > 0) {
      const scenes = await detectScenesForPart(partFilePath);
      allScenes.push(...scenes);
    } else {
      console.warn(`Segment file ${partFilePath} is missing or empty.`);
    }
  }

  return allScenes;
}

// Função para cortar o vídeo nas cenas detectadas
async function cutVideo(videoPath, scenes) {
  const promises = scenes.map((scene, index) => {
    return new Promise((resolve, reject) => {
      const output = path.join(cortesDir, `output${index}.mp4`);

      if (scene.startTime >= 0 && (scene.endTime - scene.startTime) > 0) {
        ffmpeg(videoPath)
          .setStartTime(scene.startTime)
          .setDuration(scene.endTime - scene.startTime)
          .output(output)
          .on('end', () => {
            if (fs.existsSync(output) && fs.statSync(output).size > 0) {
              console.log(`Segment ${output} saved successfully.`);
              resolve();
            } else {
              console.error(`Segment ${output} is empty or missing.`);
              reject(new Error(`Segment ${output} is empty or missing.`));
            }
          })
          .on('error', (err) => {
            console.error('Error cutting video:', err.message);
            reject(err);
          })
          .run();
      } else {
        console.warn(`Invalid scene times: ${scene.startTime} - ${scene.endTime}`);
        resolve(); // Ignorar cenas inválidas
      }
    });
  });

  await Promise.all(promises);
}

// Função principal para processar o vídeo do YouTube
async function processYouTubeVideo(youtubeUrl) {
  const localVideoPath = path.join(downloadsDir, 'video.mp4');

  try {
    console.log('Starting download of YouTube video from', youtubeUrl);
    await downloadYouTubeVideo(youtubeUrl, localVideoPath);
    console.log('Download completed.');

    console.log('Detecting scenes...');
    const scenes = await detectScenes(localVideoPath);
    console.log('Scenes detected:', scenes);

    console.log('Cutting video...');
    await cutVideo(localVideoPath, scenes);
    console.log('Video segments saved.');
  } catch (err) {
    console.error('Error processing video:', err.message);
  }
}

// URL do vídeo do YouTube a ser processado
const youtubeUrl = 'https://www.youtube.com/watch?v=_Rho1-qFhWc';
processYouTubeVideo(youtubeUrl).catch(console.error);
