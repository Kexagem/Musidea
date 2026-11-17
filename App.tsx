
import React, { useState, useRef, useEffect } from 'react';
import { Film, Sparkles, Mic, Music, Wand2, Loader2, Bot, Clapperboard, Lightbulb, Camera, ArrowRight, BookOpen, Brush, Clipboard, Download } from 'lucide-react';
import { VIDEO_CONCEPTS, VISUAL_STYLES, SHOT_STYLES, SHOT_TYPES, LENS_CHOICES, CAMERA_MOVEMENTS, LIGHTING_STYLES } from './constants';
import type { SceneAnalysisResult, ShotIdea } from './types';
import SelectControl from './components/SelectControl';
import { analyzeLyricsStructure, generateShotIdeas } from './services/geminiService';

export default function App() {
  const [lyrics, setLyrics] = useState('');
  const [audioFileName, setAudioFileName] = useState('');
  const [videoConcept, setVideoConcept] = useState(Object.keys(VIDEO_CONCEPTS)[0]);
  const [visualStyle, setVisualStyle] = useState(Object.keys(VISUAL_STYLES)[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [scenes, setScenes] = useState<string[]>([]);
  
  const [activeScene, setActiveScene] = useState('');
  const [shotStyle, setShotStyle] = useState(Object.keys(SHOT_STYLES)[0]);
  const [shotType, setShotType] = useState(Object.keys(SHOT_TYPES)[0]);
  const [lensChoice, setLensChoice] = useState(Object.keys(LENS_CHOICES)[0]);
  const [cameraMovement, setCameraMovement] = useState(Object.keys(CAMERA_MOVEMENTS)[0]);
  const [lightingStyle, setLightingStyle] = useState(Object.keys(LIGHTING_STYLES)[0]);
  
  const [isGeneratingShots, setIsGeneratingShots] = useState(false);
  const [shotsError, setShotsError] = useState('');
  const [generatedShots, setGeneratedShots] = useState<ShotIdea[]>([]);
  const [selectedShots, setSelectedShots] = useState<ShotIdea[]>([]);
  
  const [finalScript, setFinalScript] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  
  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const processAnalyzeStructure = async () => {
    if (!lyrics.trim()) {
      setAnalysisError('Please enter lyrics to analyze.');
      return;
    }
    if (!process.env.API_KEY) {
      setAnalysisError('API Key is not configured. Please set the API_KEY environment variable.');
      setIsAnalyzing(false);
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError('');
    setScenes([]);
    setActiveScene('');
    setGeneratedShots([]);
    setSelectedShots([]); // Clear selected shots from previous analysis

    try {
      const result: SceneAnalysisResult = await analyzeLyricsStructure(lyrics);
      setLyrics(result.formattedLyrics); 
      setScenes(result.sceneList);

      if (result.sceneList && result.sceneList.length > 0) {
        setActiveScene(result.sceneList[0]);
      } else {
        setAnalysisError("The AI couldn't identify any scenes. Try reformatting your lyrics (e.g., with [Chorus]) and try again.");
      }
    } catch (error) {
      console.error("Error analyzing structure:", error);
      setAnalysisError(error instanceof Error ? error.message : "Failed to analyze structure. Check the lyrics and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processGenerateShots = async () => {
    if (!activeScene) {
      setShotsError("Please select a scene first.");
      return;
    }
    if (!process.env.API_KEY) {
      setShotsError('API Key is not configured. Please set the API_KEY environment variable.');
      setIsGeneratingShots(false);
      return;
    }
    setIsGeneratingShots(true);
    setShotsError('');
    setGeneratedShots([]);
    setSelectedShots([]);

    const sceneLyrics = getLyricsForScene(activeScene);

    try {
      const shotIdeas = await generateShotIdeas({
        activeScene,
        sceneLyrics,
        videoConcept,
        visualStyle,
        shotStyle,
        shotType,
        lensChoice,
        cameraMovement,
        lightingStyle,
      });
      setGeneratedShots(shotIdeas);
      if (shotIdeas.length === 0) {
        setShotsError("The AI didn't return any shot ideas for this configuration. Try adjusting parameters or the scene.");
      }
    } catch (error) {
      console.error("Error generating shots:", error);
      setShotsError(error instanceof Error ? error.message : "The AI failed to generate shots. Try adjusting parameters or changing the scene.");
    } finally {
      setIsGeneratingShots(false);
    }
  };
  
  const getLyricsForScene = (currentScene: string): string => {
    const allLyrics = lyrics;
    const sceneIndex = scenes.indexOf(currentScene);
    if (sceneIndex === -1) return "Lyrics not found for this scene.";
    
    const startMarker = scenes[sceneIndex];
    const startIndex = allLyrics.indexOf(startMarker);
    if (startIndex === -1) return "Scene marker not found in the lyrics.";

    let sceneBlock = "";
    // Find the text block after the current scene marker
    // and before the next scene marker (if one exists)
    const afterMarkerStart = startIndex + startMarker.length;
    
    if (sceneIndex + 1 < scenes.length) {
        const nextMarker = scenes[sceneIndex + 1];
        const nextMarkerIndex = allLyrics.indexOf(nextMarker, afterMarkerStart);
        if (nextMarkerIndex !== -1) {
            sceneBlock = allLyrics.substring(afterMarkerStart, nextMarkerIndex);
        } else {
            // Should not happen if markers are consistent, but as a fallback
            sceneBlock = allLyrics.substring(afterMarkerStart);
        }
    } else {
        // Last scene, take all remaining text
        sceneBlock = allLyrics.substring(afterMarkerStart);
    }
    return sceneBlock.trim();
  };
  
  const handleShotSelection = (shot: ShotIdea) => {
    setSelectedShots(prev => 
      prev.includes(shot) ? prev.filter(s => s !== shot) : [...prev, shot]
    );
  };
  
  const handleAddToScript = () => {
    if (selectedShots.length === 0) return;
    const shotsText = selectedShots.map(s => `    - ${s}`).join('\\n');
    const scriptAddition = `${activeScene}\\n${shotsText}\\n\\n`;
    setFinalScript(prev => prev + scriptAddition);
    
    setGeneratedShots([]);
    setSelectedShots([]);
  };

  const handleCopyScript = () => {
    if (finalScript) {
      navigator.clipboard.writeText(finalScript).then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      }, () => {
        setCopySuccess('Failed to copy.');
        setTimeout(() => setCopySuccess(''), 2000);
      });
    }
  };

  const handleExportScript = () => {
    if (finalScript) {
        const blob = new Blob([finalScript], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'musidea_script.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    if (scriptTextareaRef.current) {
        scriptTextareaRef.current.scrollTop = scriptTextareaRef.current.scrollHeight;
    }
  }, [finalScript]);
  
  return (
    <div className="bg-gray-900 text-gray-200 font-sans flex flex-col h-screen w-full antialiased">
      <header className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-900 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Clapperboard className="text-indigo-400" size={28} />
          <div>
            <h1 className="text-xl font-bold text-white">Musidea</h1>
            <p className="text-xs text-gray-400">AI Music Video Script Generator</p>
          </div>
        </div>
      </header>
      
      <main className="flex-grow grid grid-cols-1 md:grid-cols-10 xl:grid-cols-12 gap-px bg-gray-700 overflow-hidden">
        
        <aside className="col-span-1 md:col-span-3 xl:col-span-3 bg-gray-800/80 p-4 flex flex-col overflow-y-auto">
          <div className="flex-grow">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Mic size={20} className="text-pink-400"/>1. Project Setup</h2>
            <div className="space-y-4">
              <SelectControl label="Video Concept" value={videoConcept} onChange={e => setVideoConcept(e.target.value)} options={VIDEO_CONCEPTS} icon={<Film size={14} className="inline mr-1 text-pink-400"/>} />
              <SelectControl label="Overall Visual Style" value={visualStyle} onChange={e => setVisualStyle(e.target.value)} options={VISUAL_STYLES} icon={<Brush size={14} className="inline mr-1 text-pink-400"/>}/>
              <div>
                <label htmlFor="lyrics-area" className="block text-sm font-medium text-gray-300 mb-1">Song Lyrics</label>
                <textarea
                    id="lyrics-area"
                    value={lyrics}
                    onChange={e => setLyrics(e.target.value)}
                    placeholder="Paste full lyrics here. Use markers like [Chorus] or [Verse] for best results."
                    className="w-full h-40 p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Audio File (Reference)</label>
                 <label htmlFor="audio-upload" className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-dashed border-gray-500 rounded-md cursor-pointer transition-colors">
                    <Music size={16} className="text-pink-400"/>
                    <span className="text-sm truncate text-gray-300">{audioFileName || 'Upload .mp3, .wav'}</span>
                </label>
                <input id="audio-upload" type="file" className="hidden" accept=".mp3,.wav" onChange={e => setAudioFileName(e.target.files && e.target.files[0] ? e.target.files[0].name : '')} />
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 pt-4 mt-2">
             <button onClick={processAnalyzeStructure} disabled={isAnalyzing} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 transition-all disabled:bg-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed">
              {isAnalyzing ? <><Loader2 size={20} className="animate-spin"/>Analyzing...</> : <><Wand2 size={20}/>Analyze Structure</>}
            </button>
            {analysisError && <p className="text-red-400 text-xs mt-2 text-center">{analysisError}</p>}
          </div>
        </aside>

        <section className="col-span-1 md:col-span-4 xl:col-span-5 bg-gray-800 p-4 flex flex-col overflow-hidden">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 flex-shrink-0"><Lightbulb size={20} className="text-yellow-400"/>2. AI Shot Planner</h2>
            {scenes.length === 0 && !isAnalyzing ? (
                <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                    <div className="p-6 border-2 border-dashed border-gray-700 rounded-lg">
                        <Bot size={48} className="mx-auto mb-2 text-gray-600"/>
                        <p>Analyze your song's structure first to start planning shots.</p>
                    </div>
                </div>
            ) : isAnalyzing ? (
                 <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                    <Loader2 size={32} className="animate-spin text-indigo-400"/>
                </div>
            ) : (
                <div className="flex flex-col flex-grow overflow-hidden">
                    <div className="flex-shrink-0 mb-4">
                        <SelectControl label="Select Scene to Plan" value={activeScene} onChange={e => {setActiveScene(e.target.value); setGeneratedShots([]); setSelectedShots([]); setShotsError('');}} options={scenes.reduce((acc, s) => ({...acc, [s]:s.replace(/---/g, '').trim()}), {})} icon={<Clapperboard size={14} className="inline mr-1 text-yellow-400"/>} />
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3"> {/* Adjusted padding for scrollbar */}
                        <SelectControl label="Emotional Style" value={shotStyle} onChange={e => setShotStyle(e.target.value)} options={SHOT_STYLES} icon={<Sparkles size={14} className="inline mr-1 text-yellow-400"/>} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <SelectControl label="Key Shot Type" value={shotType} onChange={e => setShotType(e.target.value)} options={SHOT_TYPES} />
                            <SelectControl label="Lens Philosophy" value={lensChoice} onChange={e => setLensChoice(e.target.value)} options={LENS_CHOICES} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             <SelectControl label="Camera Movement" value={cameraMovement} onChange={e => setCameraMovement(e.target.value)} options={CAMERA_MOVEMENTS} />
                             <SelectControl label="Lighting Style" value={lightingStyle} onChange={e => setLightingStyle(e.target.value)} options={LIGHTING_STYLES} />
                        </div>
                    </div>
                    <div className="flex-shrink-0 pt-4 mt-2 border-t border-gray-700">
                        <button onClick={processGenerateShots} disabled={isGeneratingShots || !activeScene} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-yellow-500 text-gray-900 font-semibold rounded-md hover:bg-yellow-400 transition-all disabled:bg-yellow-700 disabled:text-gray-500 disabled:cursor-not-allowed">
                            {isGeneratingShots ? <><Loader2 size={20} className="animate-spin"/>Generating Ideas...</> : <><Sparkles size={20}/>Generate Shot Ideas</>}
                        </button>
                        {shotsError && <p className="text-red-400 text-xs mt-2 text-center">{shotsError}</p>}
                    </div>
                </div>
            )}
        </section>
        
        <aside className="col-span-1 md:col-span-3 xl:col-span-4 bg-gray-900/80 p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                 <h2 className="text-lg font-semibold text-white flex items-center gap-2"><BookOpen size={20} className="text-teal-400"/>3. Technical Script</h2>
                 <div className="flex items-center gap-2">
                    {copySuccess && <span className="text-xs text-green-400 transition-opacity">{copySuccess}</span>}
                    <button onClick={handleCopyScript} title="Copy Script" className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!finalScript}><Clipboard size={16}/></button>
                    <button onClick={handleExportScript} title="Export as .txt" className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!finalScript}><Download size={16}/></button>
                 </div>
            </div>
            
            {generatedShots.length > 0 && (
                <div className="flex-grow flex flex-col overflow-hidden border-2 border-dashed border-indigo-500/50 rounded-lg p-3 bg-indigo-900/10 mb-4 max-h-[50%]"> {/* Added max-h */}
                    <p className="text-sm text-gray-400 mb-2 flex-shrink-0">Select shots for <span className="font-semibold text-indigo-300">{activeScene.replace(/---/g, '').trim()}</span>:</p>
                    <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2"> {/* Adjusted padding for scrollbar */}
                        {generatedShots.map((shot, index) => (
                             <div key={index} onClick={() => handleShotSelection(shot)} className={`p-2.5 rounded-md cursor-pointer transition-colors border ${selectedShots.includes(shot) ? 'bg-indigo-500/30 border-indigo-400 shadow-lg' : 'bg-gray-700/60 border-gray-600 hover:bg-gray-700 hover:border-gray-500'}`}>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" checked={selectedShots.includes(shot)} readOnly className="mt-1 flex-shrink-0 form-checkbox h-4 w-4 bg-gray-800 border-gray-600 text-indigo-500 rounded focus:ring-indigo-600 cursor-pointer"/>
                                    <span className="text-sm text-gray-300">{shot}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                    {selectedShots.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-700 flex-shrink-0">
                            <button onClick={handleAddToScript} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 transition-all">
                                Add {selectedShots.length} Shot(s) to Script <ArrowRight size={16}/>
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            <div className={`flex-grow flex flex-col overflow-hidden transition-opacity ${generatedShots.length > 0 ? 'opacity-70 focus-within:opacity-100' : 'opacity-100'}`}>
                 <textarea
                    ref={scriptTextareaRef}
                    readOnly
                    value={finalScript}
                    placeholder="Your technical script will be assembled here scene by scene..."
                    className="w-full flex-grow p-3 bg-gray-950 border border-gray-700/50 rounded-md font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-300 focus:border-teal-500"
                 />
            </div>
        </aside>
      </main>
    </div>
  );
}
