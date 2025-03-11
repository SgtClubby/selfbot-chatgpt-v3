const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  EndBehaviorType,
} = require("@discordjs/voice");
const prism = require("prism-media");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const activeConnections = new Map(); // Track connections per guild

async function joinVoiceChannelAndListen(message) {
  const channel = message.member.voice.channel;
  if (!channel) return message.reply("You need to be in a voice channel.");

  // Join the voice channel
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

// Capture voice and save it
async function captureAudio(connection, userId) {
  console.log(userId);
  return new Promise((resolve, reject) => {
    const receiver = connection.receiver;

    console.log("Listening for audio...");
    const opusStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 6000, // Increase duration to capture more audio
      },
    });
    console.log(receiver);
    opusStream.on("data", (chunk) => {
      console.log(
        `[DEBUG] Received ${chunk.length} bytes of audio from ${userId}`
      );
    });

    const pcmStream = opusStream.pipe(
      new prism.opus.Decoder({ frameSize: 960, channels: 1, rate: 48000 })
    );
    console.log("Finished listening for audio...");

    console.log("Creating audio stream to file...");
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

      // Check the file size
      const stats = fs.statSync(filePath);
      if (stats.size < 1000) {
        // Adjust threshold as needed
        console.error(
          "[DEBUG] Insufficient audio data captured (file size: " +
            stats.size +
            " bytes)"
        );
        return reject(
          new Error("Not enough audio captured. Please speak a bit longer.")
        );
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

// Transcribe audio with OpenAI Whisper
async function transcribeAudio(filePath) {
  console.log("Transcribing audio...");
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("model", "whisper-1");

  console.log("Sending request to OpenAI...");
  const response = await axios.post(
    "https://api.openai.com/v1/audio/transcriptions",
    formData,
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_APIKEY}`,
        ...formData.getHeaders(),
      },
    }
  );
  console.log("Done sending request to OpenAI!");

  if (!response.status === 400) {
    throw new Error(
      `Failed to transcribe audio: ${response.response.data.error}`
    );
  }

  return response.data.text;
}

// Get a response from ChatGPT
async function getChatGPTResponse(text) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [{ role: "user", content: text }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_APIKEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content;
}

// Convert response text to speech
async function textToSpeech(text) {
  const response = await axios.post(
    "https://api.openai.com/v1/audio/speech",
    {
      model: "tts-1",
      input: text,
      voice: "nova",
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_APIKEY}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
    }
  );

  const filePath = "./response.mp3";
  fs.writeFileSync(filePath, Buffer.from(response.data));
  return filePath;
}

// Play the AI-generated response in voice chat
async function playAudio(connection, filePath) {
  const player = createAudioPlayer();
  const resource = createAudioResource(filePath);

  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    console.log("Finished playing.");
  });
}

// Full conversation loop
async function voiceChatInteraction(connection, userId) {
  const filePath = await captureAudio(connection, userId);
  console.log("Audio captured completed.");
  const transcribedText = await transcribeAudio(filePath);
  console.log(`Transciption complete! User said: ${transcribedText}`);

  const chatResponse = await getChatGPTResponse(transcribedText);
  console.log(`ChatGPT says: ${chatResponse}`);

  const ttsFile = await textToSpeech(chatResponse);
  await playAudio(connection, ttsFile);
}

function convertPCMToMP3(inputPath, outputPath, pcmFormat = "s16le") {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      "-y",
      "-f",
      pcmFormat, // Specify the PCM format: try "s16le" or "f32le"
      "-ar",
      "48000", // Sample rate: 48000 Hz
      "-ac",
      "1", // Mono audio
      "-i",
      inputPath, // Input file
      "-acodec",
      "libmp3lame", // Use libmp3lame for encoding
      outputPath, // Output file
    ];

    console.log("Starting conversion with FFmpeg...");
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
