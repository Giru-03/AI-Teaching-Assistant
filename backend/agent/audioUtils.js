import { AssemblyAI } from 'assemblyai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

export async function transcribeAudio(filePath) {
  try {
    console.log("Transcribing audio file:", filePath);
    const transcript = await client.transcripts.transcribe({
      audio: filePath,
    });

    if (transcript.status === 'error') {
      throw new Error(transcript.error);
    }

    return transcript.text;
  } catch (error) {
    console.error("AssemblyAI Transcription Error:", error);
    throw error;
  }
}
