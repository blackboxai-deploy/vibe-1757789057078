"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "next-themes";
import TextInput from "@/components/TextInput";
import VoiceSelector from "@/components/VoiceSelector";
import AudioPlayer from "@/components/AudioPlayer";
import AudioControls from "@/components/AudioControls";
import VoiceHistory from "@/components/VoiceHistory";

interface VoiceSettings {
  voice: string;
  speed: number;
  pitch: number;
  stability: number;
  clarity: number;
}

interface GeneratedAudio {
  id: string;
  text: string;
  voice: string;
  audioUrl: string;
  duration: number;
  createdAt: Date;
  settings: VoiceSettings;
}

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<GeneratedAudio | null>(null);
  const [audioHistory, setAudioHistory] = useState<GeneratedAudio[]>([]);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voice: "rachel",
    speed: 1.0,
    pitch: 1.0,
    stability: 0.75,
    clarity: 0.75,
  });

  const audioRef = useRef<HTMLAudioElement>(null);

  const generateVoice = useCallback(async () => {
    if (!text.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          settings: voiceSettings,
        }),
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create audio element to get duration
      const audio = new Audio(audioUrl);
      await new Promise((resolve) => {
        audio.addEventListener("loadedmetadata", resolve);
      });

      const newAudio: GeneratedAudio = {
        id: Date.now().toString(),
        text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        voice: voiceSettings.voice,
        audioUrl,
        duration: audio.duration,
        createdAt: new Date(),
        settings: { ...voiceSettings },
      };

      setCurrentAudio(newAudio);
      setAudioHistory(prev => [newAudio, ...prev.slice(0, 9)]); // Keep last 10
      
    } catch (error) {
      console.error("Voice generation failed:", error);
      alert("Failed to generate voice. Please try again.");
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [text, voiceSettings, isGenerating]);

  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = text.length;
  const estimatedDuration = Math.ceil(wordCount / 2.5); // ~2.5 words per second

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
          <h1 className="relative text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Text to Human Voice
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Transform your text into natural, expressive human speech using advanced AI voice synthesis
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Badge variant="secondary" className="text-sm">
            🎤 Multiple Voices
          </Badge>
          <Badge variant="secondary" className="text-sm">
            🌍 Multi-Language
          </Badge>
          <Badge variant="secondary" className="text-sm">
            ⚡ Real-time Generation
          </Badge>
          <Badge variant="secondary" className="text-sm">
            🎵 High Quality Audio
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Text Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Text Input</span>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{charCount} characters</span>
                  <span>{wordCount} words</span>
                  <span>~{estimatedDuration}s duration</span>
                </div>
              </CardTitle>
              <CardDescription>
                Enter the text you want to convert to speech
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TextInput
                value={text}
                onChange={setText}
                placeholder="Enter your text here... Try adding emphasis with *bold text* or pauses with commas and periods for natural speech rhythm."
              />
            </CardContent>
          </Card>

          {/* Voice Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Voice Selection</CardTitle>
                <CardDescription>Choose your preferred voice and accent</CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceSelector
                  value={voiceSettings.voice}
                  onChange={(voice) => setVoiceSettings(prev => ({ ...prev, voice }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Voice Controls</CardTitle>
                <CardDescription>Fine-tune speech parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <AudioControls
                  settings={voiceSettings}
                  onChange={setVoiceSettings}
                />
              </CardContent>
            </Card>
          </div>

          {/* Generation Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Generating voice...</span>
                      <span>{Math.round(generationProgress)}%</span>
                    </div>
                    <Progress value={generationProgress} />
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <Button
                    onClick={generateVoice}
                    disabled={!text.trim() || isGenerating}
                    size="lg"
                    className="flex-1 md:flex-none"
                  >
                    {isGenerating ? "Generating..." : "Generate Voice"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    size="lg"
                  >
                    {theme === "dark" ? "🌞" : "🌙"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audio Player */}
          {currentAudio && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Audio</CardTitle>
                <CardDescription>
                  Voice: {currentAudio.voice} • Duration: {Math.round(currentAudio.duration)}s
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AudioPlayer
                  audio={currentAudio}
                  audioRef={audioRef}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <VoiceHistory
            history={audioHistory}
            onSelect={setCurrentAudio}
            currentAudio={currentAudio}
          />

          {/* Features Card */}
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Natural Voices</div>
                    <div className="text-muted-foreground">Ultra-realistic human speech synthesis</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Voice Control</div>
                    <div className="text-muted-foreground">Adjust speed, pitch, and clarity</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Audio Download</div>
                    <div className="text-muted-foreground">Save generated voices as MP3</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">History</div>
                    <div className="text-muted-foreground">Access previous generations</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}