# Video Processing with Subtitles

This project is designed to download a YouTube video, process it by detecting scenes, transcribing audio to generate subtitles, and then cutting the video into segments with added subtitles.

## Features

- Download a YouTube video
- Detect scenes in the video using Google Cloud Video Intelligence API
- Transcribe the audio to generate subtitles
- Create SRT files for the subtitles
- Cut the video into segments based on detected scenes
- Add subtitles to each video segment

## Prerequisites

- Node.js and npm installed
- Google Cloud account with access to the Video Intelligence API
- API key for Google Cloud Video Intelligence

## Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/your-username/video-processing-with-subtitles.git
    cd video-processing-with-subtitles
    ```

2. Install the dependencies:

    ```bash
    npm install
    ```

3. Create the necessary directories:

    ```bash
    mkdir downloads
    mkdir cortes
    mkdir subtitles
    ```

4. Add your Google Cloud Video Intelligence API key file to the project directory and update the `keyFilename` in the code:

    ```javascript
    const client = new VideoIntelligenceServiceClient({
      keyFilename: 'path/to/your/google-cloud-api-key.json'
    });
    ```

## Usage

1. Update the YouTube video URL in the script:

    ```javascript
    const youtubeUrl = 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID';
    ```

2. Run the script:

    ```bash
    node your-script-name.js
    ```

The script will download the video, process it to detect scenes, transcribe the audio, generate subtitles, cut the video into segments, and add the subtitles to each segment.
