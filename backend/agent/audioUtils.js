import { AssemblyAI } from 'assemblyai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

let clientInstance = null;
function getAssemblyClient() {
    if (!clientInstance) {
        if (!process.env.ASSEMBLYAI_API_KEY) {
            throw new Error("ASSEMBLYAI_API_KEY is missing");
        }
        clientInstance = new AssemblyAI({
            apiKey: process.env.ASSEMBLYAI_API_KEY,
        });
    }
    return clientInstance;
}

export async function transcribeAudio(filePath) {
  try {
    console.log("Transcribing audio file:", filePath);
    const transcript = await getAssemblyClient().transcripts.transcribe({
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
