// selfbot-chatgpt-v3/modules/voice.js

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  EndBehaviorType,
} = require("@discordjs/voice");
const prism = require("prism-media");
const fs = require("fs");
const FormData = require("form-data");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const activeConnections = new Map();

/**
 * Joins voice channel and sets up for listening
 *
 * @param {Object} message - Discord message object
 * @returns {Object|null} Voice connection or null if failed
 */
async function joinVoiceChannelAndListen(message) {
  const channel = message.member.voice.channel;
  if (!channel) {
    message.reply("You need to be in a voice channel.");
    return null;
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  activeConnections.set(message.guild.id, connection);
  message.reply("Joined voice channel. Start speaking...");

  return connection;
}

/**
 * Captures audio from user and saves to file
 *
 * @param {Object} connection - Voice connection
 * @param {string} userId - User ID to capture audio from
 * @returns {Promise<string>} Path to saved audio file
 */
async function captureAudio(connection, userId) {
  return new Promise((resolve, reject) => {
    const receiver = connection.receiver;

    console.log("Listening for audio...");
    const opusStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 6000,
      },
    });

    opusStream.on("data", (chunk) => {
      console.log(`[DEBUG] Received ${chunk.length} bytes of audio from ${userId}`);
    });

    const pcmStream = opusStream.pipe(
      new prism.opus.Decoder({ frameSize: 960, channels: 1, rate: 48000 })
    );

    const filePath = `./recorded_audio_${userId}.pcm`;
    const mp3FilePath = `./recorded_audio_${userId}.mp3`;
    const fileStream = fs.createWriteStream(filePath);

    pcmStream.pipe(fileStream);

    fileStream.on("error", (err) => {
      console.error("File stream error:", err);
      reject(err);
    });

    fileStream.on("finish", async () => {
      console.log("[DEBUG] File finished writing, filePath:", filePath);

      const stats = fs.statSync(filePath);
      if (stats.size < 1000) {
        console.error(`[DEBUG] Insufficient audio data captured (file size: ${stats.size} bytes)`);
        return reject(new Error("Not enough audio captured. Please speak a bit longer."));
      }

      try {
        await convertPCMToMP3(filePath, mp3FilePath, "s16le");
        console.log("[DEBUG] MP3 conversion complete.");
        resolve(mp3FilePath);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Transcribes audio using OpenAI Whisper
 *
 * @param {string} filePath - Path to audio file
 * @returns {Promise<string>} Transcribed text
 */
async function transcribeAudio(filePath) {
  const openai = await import("../openai/openai.mjs").then((m) => m.default);

  console.log("Transcribing audio...");

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Gets ChatGPT response for transcribed text
 *
 * @param {string} text - Input text
 * @returns {Promise<string>} AI response
 */
async function getChatGPTResponse(text) {
  const openai = await import("../openai/openai.mjs").then((m) => m.default);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: text }],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    throw new Error(`Failed to get ChatGPT response: ${error.message}`);
  }
}

/**
 * Converts text to speech using OpenAI TTS
 *
 * @param {string} text - Text to convert
 * @returns {Promise<string>} Path to audio file
 */
async function textToSpeech(text) {
  const openai = await import("../openai/openai.mjs").then((m) => m.default);

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const filePath = "./response.mp3";
    fs.writeFileSync(filePath, buffer);

    return filePath;
  } catch (error) {
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

/**
 * Plays audio file in voice channel
 *
 * @param {Object} connection - Voice connection
 * @param {string} filePath - Path to audio file
 */
async function playAudio(connection, filePath) {
  const player = createAudioPlayer();
  const resource = createAudioResource(filePath);

  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    console.log("Finished playing audio.");
  });
}

/**
 * Handles complete voice chat interaction flow
 *
 * @param {Object} connection - Voice connection
 * @param {string} userId - User ID
 */
async function voiceChatInteraction(connection, userId) {
  try {
    const filePath = await captureAudio(connection, userId);
    console.log("Audio capture completed.");

    const transcribedText = await transcribeAudio(filePath);
    console.log(`Transcription complete! User said: ${transcribedText}`);

    const chatResponse = await getChatGPTResponse(transcribedText);
    console.log(`ChatGPT says: ${chatResponse}`);

    const ttsFile = await textToSpeech(chatResponse);
    await playAudio(connection, ttsFile);

    // Clean up temporary files
    fs.unlinkSync(filePath);
    fs.unlinkSync(ttsFile);
  } catch (error) {
    console.error("Voice chat interaction error:", error);
  }
}

/**
 * Converts PCM audio to MP3 format
 *
 * @param {string} inputPath - Input PCM file path
 * @param {string} outputPath - Output MP3 file path
 * @param {string} pcmFormat - PCM format (default: "s16le")
 * @returns {Promise<string>} Output file path
 */
function convertPCMToMP3(inputPath, outputPath, pcmFormat = "s16le") {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      "-y",
      "-f",
      pcmFormat,
      "-ar",
      "48000",
      "-ac",
      "1",
      "-i",
      inputPath,
      "-acodec",
      "libmp3lame",
      outputPath,
    ];

    console.log("Starting PCM to MP3 conversion with FFmpeg...");
    const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);

    ffmpegProcess.stderr.on("data", (data) => {
      console.log(`FFmpeg: ${data}`);
    });

    ffmpegProcess.on("error", (err) => {
      console.error("FFmpeg process error:", err);
      reject(err);
    });

    ffmpegProcess.on("close", (code) => {
      if (code === 0) {
        console.log(`Conversion complete. MP3 saved to ${outputPath}`);
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg conversion failed with code ${code}`));
      }
    });
  });
}

module.exports = {
  joinVoiceChannelAndListen,
  voiceChatInteraction,
};
