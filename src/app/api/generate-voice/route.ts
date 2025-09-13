import { NextRequest, NextResponse } from "next/server";

interface VoiceSettings {
  voice: string;
  speed: number;
  pitch: number;
  stability: number;
  clarity: number;
}

interface GenerateVoiceRequest {
  text: string;
  settings: VoiceSettings;
  preview?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateVoiceRequest = await req.json();
    const { text, settings, preview = false } = body;

    // Validate input
    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (text.length > 5000 && !preview) {
      return NextResponse.json(
        { error: "Text too long. Maximum 5000 characters allowed." },
        { status: 400 }
      );
    }

    // For preview, limit text length
    const processedText = preview ? text.substring(0, 100) : text;

    // Prepare the voice generation request
    const voiceRequest = {
      model: "elevenlabs/eleven-multilingual-v2", // Using ElevenLabs for high-quality human voices
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            text: processedText,
            voice: settings.voice || "rachel",
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: settings.stability || 0.75,
              similarity_boost: settings.clarity || 0.75,
              style: 0.0,
              use_speaker_boost: true,
            },
            pronunciation_dictionary_locators: [],
            seed: null,
            previous_text: null,
            next_text: null,
            previous_request_ids: [],
            next_request_ids: []
          })
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    };

    // Make request to the custom endpoint
    const response = await fetch("https://oi-server.onrender.com/chat/completions", {
      method: "POST",
      headers: {
        "CustomerId": "cus_Sc64a7mwlJwpuu",
        "Content-Type": "application/json",
        "Authorization": "Bearer xxx"
      },
      body: JSON.stringify(voiceRequest)
    });

    if (!response.ok) {
      console.error("Voice generation API error:", response.status, response.statusText);
      const errorData = await response.text();
      console.error("Error details:", errorData);
      
      return NextResponse.json(
        { error: `Voice generation failed: ${response.status} ${response.statusText}` },
        { status: 500 }
      );
    }

    // Check content type - if it's JSON, there might be an error or different response format
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      const jsonResponse = await response.json();
      
      // Check if the response contains audio data in a different format
      if (jsonResponse.choices && jsonResponse.choices[0] && jsonResponse.choices[0].message) {
        const message = jsonResponse.choices[0].message.content;
        
        // If it's a base64 encoded audio
        if (typeof message === "string" && message.startsWith("data:audio")) {
          // Extract base64 data
          const base64Data = message.split(",")[1];
          
          // Decode base64 to bytes
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          return new NextResponse(bytes, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": bytes.length.toString(),
              "Cache-Control": "no-cache",
            },
          });
        }
        
        // If it's a URL to audio file
        if (typeof message === "string" && (message.startsWith("http") || message.startsWith("https"))) {
          const audioResponse = await fetch(message);
          if (audioResponse.ok) {
            const audioBuffer = await audioResponse.arrayBuffer();
            return new NextResponse(audioBuffer, {
              headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.byteLength.toString(),
                "Cache-Control": "no-cache",
              },
            });
          }
        }
      }
      
      console.error("Unexpected JSON response:", jsonResponse);
      return NextResponse.json(
        { error: "Unexpected response format from voice API" },
        { status: 500 }
      );
    }

    // If content type indicates audio, stream it directly
    if (contentType?.includes("audio")) {
      const audioBuffer = await response.arrayBuffer();
      
      return new NextResponse(audioBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": audioBuffer.byteLength.toString(),
          "Cache-Control": "no-cache",
        },
      });
    }

    // Fallback: try to get as array buffer anyway
    try {
      const audioBuffer = await response.arrayBuffer();
      
      if (audioBuffer.byteLength === 0) {
        throw new Error("Empty response");
      }
      
      return new NextResponse(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": audioBuffer.byteLength.toString(),
          "Cache-Control": "no-cache",
        },
      });
    } catch (bufferError) {
      console.error("Failed to process response as audio:", bufferError);
      
      // Return error response instead of fallback audio
      return NextResponse.json(
        { error: "Failed to process voice generation request" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Voice generation error:", error);
    
    return NextResponse.json(
      { error: "Internal server error during voice generation" },
      { status: 500 }
    );
  }
}



export async function GET() {
  return NextResponse.json({
    message: "Voice Generation API",
    status: "ready",
    supportedVoices: [
      "rachel", "domi", "bella", "antoni", "elli", 
      "josh", "arnold", "adam", "sam"
    ]
  });
}