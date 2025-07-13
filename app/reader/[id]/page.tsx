"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Key,
  Lightbulb,
  Save,
  Share,
  Sparkles,
  MessageCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useReaderStore, PaperType } from "@/lib/reader-store"
import { UploadPapersSidebar } from "@/components/upload-papers-sidebar"
import { PaperTabs } from "@/components/paper-tabs"
import { PDFViewer } from "@/components/pdf-viewer"
import { useRouter } from "next/navigation"
import { use } from "react"
import dynamic from "next/dynamic"

// Dynamically import CopilotChat
const CopilotChat = dynamic(() => import('@/components/copilot-chat'), {
  ssr: false,
})

// Mock paper data - Ensure it matches PaperType (using _id)
const paperData = {
  "1": {
    _id: "1", // Use _id to match PaperType
    title: "Attention Is All You Need",
    authors:
      "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin",
    abstract:
      "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs, a small fraction of the training costs of the best models from the literature. We show that the Transformer generalizes well to other tasks by applying it successfully to English constituency parsing both with large and limited training data.",
    year: "2017",
    venue: "NeurIPS",
    url: "https://arxiv.org/abs/1706.03762",
    sections: [
      {
        title: "Introduction",
        content:
          "Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Numerous efforts have been made to improve recurrent neural networks by addressing their fundamental constraint of sequential computation that prevents parallelization within training examples.\n\nAttention mechanisms have become an integral part of compelling sequence modeling and transduction models in various tasks, allowing modeling of dependencies without regard to their distance in the input or output sequences. In all but a few cases, however, such attention mechanisms are used in conjunction with a recurrent network.\n\nIn this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output. The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.",
      },
      {
        title: "Model Architecture",
        content:
          "Most competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence of symbol representations (x₁, ..., xₙ) to a sequence of continuous representations z = (z₁, ..., zₙ). Given z, the decoder then generates an output sequence (y₁, ..., yₘ) of symbols one element at a time. At each step the model is auto-regressive, consuming the previously generated symbols as additional input when generating the next.\n\nThe Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder, shown in the left and right halves of Figure 1, respectively.",
      },
    ],
  },
  "2": {
    _id: "2", // Use _id to match PaperType
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: "Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova",
    abstract:
      "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks, such as question answering and language inference, without substantial task-specific architecture modifications. BERT is conceptually simple and empirically powerful. It obtains new state-of-the-art results on eleven natural language processing tasks, including pushing the GLUE score to 80.5% (7.7% point absolute improvement), MultiNLI accuracy to 86.7% (4.6% absolute improvement), SQuAD v1.1 question answering Test F1 to 93.2 (1.5 point absolute improvement) and SQuAD v2.0 Test F1 to 83.1 (5.1 point absolute improvement).",
    year: "2019",
    venue: "NAACL",
    url: "https://arxiv.org/abs/1810.04805",
    sections: [
      {
        title: "Introduction",
        content:
          "Language model pre-training has been shown to be effective for improving many natural language processing tasks. These include sentence-level tasks such as natural language inference and paraphrasing, which aim to predict the relationships between sentences by analyzing them holistically, as well as token-level tasks such as named entity recognition and question answering, where models are required to produce fine-grained output at the token level.\n\nThere are two existing strategies for applying pre-trained language representations to downstream tasks: feature-based and fine-tuning. The feature-based approach, such as ELMo, uses task-specific architectures that include the pre-trained representations as additional features. The fine-tuning approach, such as the Generative Pre-trained Transformer (OpenAI GPT), introduces minimal task-specific parameters, and is trained on the downstream tasks by simply fine-tuning all pretrained parameters. The two approaches share the same objective function during pre-training, where they use unidirectional language models to learn general language representations.",
      },
      {
        title: "Related Work",
        content:
          "There is a long history of pre-training in NLP. Word embeddings have been pre-trained using various methods and then used as inputs to downstream tasks. Pre-trained word embeddings are an integral part of modern NLP systems, offering significant improvements over embeddings learned from scratch.\n\nELMo and its predecessor take unidirectional language models a step further, by extracting context-sensitive features from a left-to-right and a right-to-left language model. The contextual representations of each token are constructed by concatenating the left-to-right and the right-to-left representations. When integrating contextual word embeddings with existing task-specific architectures, ELMo advances the state of the art for several major NLP benchmarks.",
      },
    ],
  },
  "3": {
    _id: "3", // Use _id to match PaperType
    title: "GPT-3: Language Models are Few-Shot Learners",
    authors:
      "Tom B. Brown, Benjamin Mann, Nick Ryder, Melanie Subbiah, Jared Kaplan, Prafulla Dhariwal, Arvind Neelakantan, Pranav Shyam, Girish Sastry, Amanda Askell, Sandhini Agarwal, Ariel Herbert-Voss, Gretchen Krueger, Tom Henighan, Rewon Child, Aditya Ramesh, Daniel M. Ziegler, Jeffrey Wu, Clemens Winter, Christopher Hesse, Mark Chen, Eric Sigler, Mateusz Litwin, Scott Gray, Benjamin Chess, Jack Clark, Christopher Berner, Sam McCandlish, Alec Radford, Ilya Sutskever, Dario Amodei",
    abstract:
      "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. While typically task-agnostic in architecture, this method still requires task-specific fine-tuning datasets of thousands or tens of thousands of examples. By contrast, humans can generally perform a new language task from only a few examples or from simple instructions - something which current NLP systems still largely struggle to do. Here we show that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches. Specifically, we train GPT-3, an autoregressive language model with 175 billion parameters, 10x more than any previous non-sparse language model, and test its performance in the few-shot setting. For all tasks, GPT-3 is applied without any gradient updates or fine-tuning, with tasks and few-shot demonstrations specified purely via text interaction with the model. GPT-3 achieves strong performance on many NLP datasets, including translation, question-answering, and cloze tasks, as well as several tasks that require on-the-fly reasoning or domain adaptation, such as unscrambling words, using a novel word in a sentence, or performing 3-digit arithmetic. At the same time, we also identify some datasets where GPT-3's few-shot learning still struggles, as well as some datasets where GPT-3 faces methodological issues related to training on large web corpora. Finally, we find that GPT-3 can generate samples of news articles which human evaluators have difficulty distinguishing from articles written by humans. We discuss broader societal impacts of this finding and of GPT-3 in general.",
    year: "2020",
    venue: "NeurIPS",
    url: "https://arxiv.org/abs/2005.14165",
    sections: [
      {
        title: "Introduction",
        content:
          "Recent years have featured a trend towards pre-trained language representations in NLP systems, applied in increasingly flexible and task-agnostic ways for downstream transfer. First, single-layer representations were learned using word vectors and fed to task-specific architectures. Then contextual representations were learned using language models (LMs), still requiring task-specific architectures. More recently, task-specific architectures have been replaced by pre-trained architectures, where the same architecture is used for pre-training and for downstream tasks, with minimal parameter additions. The most recent trend has been towards task-agnostic pre-training, where the same pre-trained model can be directly fine-tuned for many downstream tasks without architecture modification.\n\nIn this paper we test a different approach: we train a language model on a diverse corpus of text, but then evaluate its performance on tasks that it was not specifically trained for, either with no examples or just a few examples to provide context for the task.",
      },
      {
        title: "Approach",
        content:
          "Our basic pre-training approach, including model, data, and training, follows the work on language models in the previous literature. Unlike prior work, we focus on the performance of these models in the zero-shot, one-shot, and few-shot settings. We evaluate zero-shot performance by presenting the model with a natural language instruction or 'prompt' that describes the task and then directly evaluating performance on the task. For one-shot and few-shot learning, we present the model with one or a few examples of the task at inference time as conditioning, but importantly, no weight updates are allowed.\n\nWe evaluate on a large set of tasks drawn from the NLP literature. We try to select tasks that are representative of tasks that are challenging for current NLP systems and also diverse. We include tasks of question answering, translation, commonsense reasoning, reading comprehension, and several others.",
      },
    ],
  },
}

// Removed initialOpenPapers to prevent resetting tabs

export default function ReaderPage({ params }: { params: { id: string } }) {
  // Use React.use() to unwrap params as recommended by Next.js
  const unwrappedParams = use(params as any) as { id: string };
  const paperIdFromUrl = unwrappedParams.id;
  
  const { openPapers, setOpenPapers, activePaperId, setActivePaperId, addPaper, removePaper, clearAllPapers, hasHydrated, setHasHydrated } = useReaderStore()
  const [copilotChatOpen, setCopilotChatOpen] = useState(true)
  const [copilotAutoPrompt, setCopilotAutoPrompt] = useState<string>('')
  const [forceExpandCopilot, setForceExpandCopilot] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const { toast } = useToast()
  const router = useRouter()

  // Get the current active paper from openPapers
  const currentPaper = openPapers.find(p => p.id === activePaperId)?.paper || null;

  // Quick synchronous check for existing tabs on mount to prevent flash
  useEffect(() => {
    const checkExistingTabs = () => {
      try {
        const saved = localStorage.getItem('reader-tabs-storage');
        if (saved) {
          const parsed = JSON.parse(saved);
          // If there are saved tabs, we know not to show empty state
          if (parsed?.state?.openPapers?.length > 0) {
            setIsInitialLoad(false);
          }
        }
      } catch (error) {
        console.error('Error checking existing tabs:', error);
      }
      
      // After quick check, proceed with full hydration
      const rehydrate = async () => {
        try {
          await useReaderStore.persist.rehydrate();
          setHasHydrated(true);
          setIsInitialLoad(false);
        } catch (error) {
          console.error('Hydration failed:', error);
          setHasHydrated(true);
          setIsInitialLoad(false);
        }
      };
      
      if (!hasHydrated) {
        rehydrate();
      }
    };
    
    checkExistingTabs();
  }, [hasHydrated, setHasHydrated]);

  // Fetch paper data from API (only on initial load)
  useEffect(() => {
    const fetchInitialPaper = async (idToFetch: string) => {
      if (!idToFetch) {
         return;
      }
      
      // Check if paper is already loaded in saved tabs
      if (openPapers.some(p => p.id === idToFetch)) {
        // Paper is already loaded, just switch to it
        setActivePaperId(idToFetch);
        return;
      }
      
      try {
        const response = await fetch(`/api/papers/${idToFetch}`);
        if (!response.ok) {
          throw new Error('Failed to fetch paper');
        }
        const data = await response.json();
        
        if (!data.paper) {
          throw new Error('Paper data not found in response');
        }
        
        const fetchedPaper: PaperType = data.paper;
        const actualPaperId = fetchedPaper._id.toString();
        
        // Add to open papers with full paper data
        addPaper({ id: actualPaperId, title: fetchedPaper.title, paper: fetchedPaper });
        
        setActivePaperId(actualPaperId);
        
      } catch (error) {
        console.error('Error fetching paper:', error);
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        toast({
          title: 'Error',
          description: `Failed to load paper (${errorMsg}). Trying mock data.`,
          variant: 'destructive',
        });
        // Use mock data as fallback
        const mockPaper = paperData[idToFetch as keyof typeof paperData];
        if (mockPaper) {
          addPaper({ id: idToFetch, title: mockPaper.title, paper: mockPaper as PaperType });
          setActivePaperId(idToFetch);
        }
      }
    };

    // Only fetch if we have a paper ID from URL and it's not already loaded
    // Don't auto-load if activePaperId is explicitly empty (user closed all tabs)
    if (paperIdFromUrl && !openPapers.some(p => p.id === paperIdFromUrl) && hasHydrated) {
      fetchInitialPaper(paperIdFromUrl);
    } else if (paperIdFromUrl && openPapers.some(p => p.id === paperIdFromUrl) && openPapers.length > 0 && activePaperId !== paperIdFromUrl) {
      // Paper is already loaded, just switch to it (but only if it's not already active)
      setActivePaperId(paperIdFromUrl);
    }
    
      }, [paperIdFromUrl, openPapers, addPaper, setActivePaperId, toast, hasHydrated]);

  const handleTabChange = (id: string) => {
    // Only proceed if the tab is actually changing
    if (id === activePaperId) {
      return;
    }
    
    // Verify the paper exists in open papers
    const paperExists = openPapers.some(p => p.id === id);
    if (!paperExists) {
      console.error('Paper not found in open papers:', id);
      return;
    }
    
    // Just switch tabs without navigation - instant switching!
    setActivePaperId(id);
    // Update URL without page reload
    window.history.replaceState(null, '', `/reader/${id}`);
  };

  const handlePaperClickFromSidebar = async (paperId: string) => {
    // Check if paper is already in tabs, if so just switch to it
    const existingTab = openPapers.find(p => p.id === paperId);
    if (existingTab) {
      // Just switch to existing tab - no loading!
      setActivePaperId(paperId);
      window.history.replaceState(null, '', `/reader/${paperId}`);
      return;
    }

    // If not in tabs, fetch paper info and add as new tab
    try {
      const response = await fetch(`/api/papers/${paperId}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedPaper: PaperType = data.paper;
        
        // Add to open papers with full paper data
        addPaper({ 
          id: paperId, 
          title: fetchedPaper.title, 
          paper: fetchedPaper 
        });
        
        // Switch to the new tab
        setActivePaperId(paperId);
        window.history.replaceState(null, '', `/reader/${paperId}`);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load paper',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching paper for tab:', error);
      toast({
        title: 'Error',
        description: 'Failed to load paper',
        variant: 'destructive',
      });
    }
  };

  const handleTabClose = (id: string) => {
    const newOpenPapers = openPapers.filter((paper) => paper.id !== id);
    removePaper(id);
    
    // If we're closing the currently active tab, switch to another tab
    if (id === activePaperId && newOpenPapers.length > 0) {
      // Find the index of the closed tab to determine which tab to switch to
      const closedTabIndex = openPapers.findIndex(p => p.id === id);
      let nextTabIndex = closedTabIndex;
      
      // If we closed the last tab, go to the previous one
      if (nextTabIndex >= newOpenPapers.length) {
        nextTabIndex = newOpenPapers.length - 1;
      }
      
      // Switch to the next tab without navigation - instant switching!
      const nextPaperId = newOpenPapers[nextTabIndex].id;
      setActivePaperId(nextPaperId);
      window.history.replaceState(null, '', `/reader/${nextPaperId}`);
    } else if (newOpenPapers.length === 0) {
      // If no tabs left, clear active paper and navigate to base reader page
      setActivePaperId('');
      // Navigate to base reader page to prevent the useEffect from reloading the paper
      window.history.replaceState(null, '', '/reader');
    }
  };

  const handleAddToCopilotChat = (text: string) => {
    // Set the auto-prompt text and open copilot chat
    setCopilotAutoPrompt(text);
    setCopilotChatOpen(true);
    setForceExpandCopilot(true);
    
    // Reset force expand after a short delay
    setTimeout(() => {
      setForceExpandCopilot(false);
    }, 100);
  };

  const handlePaperDeleted = (paperId: string) => {
    // Close the tab for the deleted paper
    handleTabClose(paperId);
  };

  const handleAllPapersDeleted = () => {
    // Close all tabs
    clearAllPapers();
  };







  // Show loading state while hydrating or during initial load
  if (!hasHydrated || isInitialLoad) {
    return (
      <div className="flex flex-col h-screen bg-ivory">
        {/* Header */}
        <header className="border-b shadow-sm bg-white">
          <div className="flex h-16 items-center px-4 md:px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-royal-500 p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-sans font-bold text-royal-500">
                Eureka
              </span>
            </Link>
            
            {/* Centered Navigation */}
            <div className="flex-1 flex justify-center">
              <nav className="flex gap-6">
                <Link href="/reader" className="font-sans font-bold text-royal-700 underline underline-offset-4">Reader</Link>
                <Link href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</Link>
                <Link href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</Link>
                <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
              </nav>
            </div>
            
            {/* Right spacer to balance the logo */}
            <div className="w-[140px]"></div>
          </div>
        </header>

        {/* Paper Tabs */}
        <PaperTabs
          papers={openPapers.map(p => ({ id: p.id, title: p.title }))}
          activePaperId={activePaperId}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
        />

        {/* Main Content with Sidebars */}
        <div className="flex-1 relative overflow-hidden">
          {/* Left Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 z-10">
            <UploadPapersSidebar onPaperClick={handlePaperClickFromSidebar} onPaperDeleted={handlePaperDeleted} onAllPapersDeleted={handleAllPapersDeleted} />
          </div>

          {/* Center Content - Loading State */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md opacity-0">
              {/* Invisible placeholder to prevent layout shift */}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="absolute right-0 top-0 bottom-0 z-10">
            <CopilotChat
              isOpen={true}
              onClose={() => {
                setCopilotChatOpen(false);
                setCopilotAutoPrompt('');
              }}
              paperId={activePaperId}
              autoPrompt={copilotAutoPrompt}
              forceExpand={forceExpandCopilot}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show blank state if no tabs are open (only after hydration is complete)
  if (hasHydrated && !isInitialLoad && openPapers.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-ivory">
        {/* Header */}
        <header className="border-b shadow-sm bg-white">
          <div className="flex h-16 items-center px-4 md:px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-royal-500 p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-sans font-bold text-royal-500">
                Eureka
              </span>
            </Link>
            
            {/* Centered Navigation */}
            <div className="flex-1 flex justify-center">
              <nav className="flex gap-6">
                <Link href="/reader" className="font-sans font-bold text-royal-700 underline underline-offset-4">Reader</Link>
                <Link href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</Link>
                <Link href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</Link>
                <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
              </nav>
            </div>
            
            {/* Right spacer to balance the logo */}
            <div className="w-[140px]"></div>
          </div>
        </header>

        {/* Paper Tabs */}
        <PaperTabs
          papers={openPapers.map(p => ({ id: p.id, title: p.title }))}
          activePaperId={activePaperId}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
        />

        {/* Main Content with Sidebars */}
        <div className="flex-1 relative overflow-hidden">
          {/* Left Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 z-10">
            <UploadPapersSidebar onPaperClick={handlePaperClickFromSidebar} onPaperDeleted={handlePaperDeleted} onAllPapersDeleted={handleAllPapersDeleted} />
          </div>

          {/* Center Content - Always Centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md">
              <div className="inline-flex items-center justify-center rounded-full bg-royal-100 p-6 text-royal-500">
                <BookOpen className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">No Tabs Open</h1>
                <p className="text-gray-500">
                  Click on a paper from the sidebar to open a new tab, or upload a new paper to get started.
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="absolute right-0 top-0 bottom-0 z-10">
          <CopilotChat
            isOpen={true}
            onClose={() => {
              setCopilotChatOpen(false);
              setCopilotAutoPrompt(''); // Clear auto-prompt when closing
            }}
            paperId={activePaperId}
            autoPrompt={copilotAutoPrompt}
              forceExpand={forceExpandCopilot}
          />
          </div>
        </div>
      </div>
    );
  } 



  // Display the PDF if filePath exists - fall back to blank state if no current paper (but not during initial load)
  if (!currentPaper && hasHydrated && !isInitialLoad) {
    return (
      <div className="flex flex-col h-screen bg-ivory">
        {/* Header */}
        <header className="border-b shadow-sm bg-white">
          <div className="flex h-16 items-center px-4 md:px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-royal-500 p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-sans font-bold text-royal-500">
                Eureka
              </span>
            </Link>
            
            {/* Centered Navigation */}
            <div className="flex-1 flex justify-center">
              <nav className="flex gap-6">
                <Link href="/reader" className="font-sans font-bold text-royal-700 underline underline-offset-4">Reader</Link>
                <Link href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</Link>
                <Link href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</Link>
                <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
              </nav>
            </div>
            
            {/* Right spacer to balance the logo */}
            <div className="w-[140px]"></div>
          </div>
        </header>

        {/* Paper Tabs */}
        <PaperTabs
          papers={openPapers.map(p => ({ id: p.id, title: p.title }))}
          activePaperId={activePaperId}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
        />

        {/* Main Content with Sidebars */}
        <div className="flex-1 relative overflow-hidden">
          {/* Left Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 z-10">
            <UploadPapersSidebar onPaperClick={handlePaperClickFromSidebar} onPaperDeleted={handlePaperDeleted} onAllPapersDeleted={handleAllPapersDeleted} />
          </div>

          {/* Center Content - Always Centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md">
              <div className="inline-flex items-center justify-center rounded-full bg-royal-100 p-6 text-royal-500">
                <BookOpen className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">No Papers Open</h1>
                <p className="text-gray-500">
                  Click on a paper from the sidebar to open a new tab, or upload a new paper to get started.
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="absolute right-0 top-0 bottom-0 z-10">
          <CopilotChat
            isOpen={true}
            onClose={() => {
              setCopilotChatOpen(false);
              setCopilotAutoPrompt(''); // Clear auto-prompt when closing
            }}
            paperId={activePaperId}
            autoPrompt={copilotAutoPrompt}
              forceExpand={forceExpandCopilot}
          />
          </div>
        </div>
      </div>
    );
  }

  // If no current paper but we have tabs, show empty paper state
  if (!currentPaper && openPapers.length > 0) {
    return (
      <div className="flex flex-col h-screen bg-ivory">
        {/* Header */}
        <header className="border-b shadow-sm bg-white">
          <div className="flex h-16 items-center px-4 md:px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-royal-500 p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-sans font-bold text-royal-500">
                Eureka
              </span>
            </Link>
            
            {/* Centered Navigation */}
            <div className="flex-1 flex justify-center">
              <nav className="flex gap-6">
                <Link href="/reader" className="font-sans font-bold text-royal-700 underline underline-offset-4">Reader</Link>
                <Link href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</Link>
                <Link href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</Link>
                <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
              </nav>
            </div>
            
            {/* Right spacer to balance the logo */}
            <div className="w-[140px]"></div>
          </div>
        </header>

        {/* Paper Tabs */}
        <PaperTabs
          papers={openPapers.map(p => ({ id: p.id, title: p.title }))}
          activePaperId={activePaperId}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
        />

        {/* Main Content with Sidebars */}
        <div className="flex-1 relative overflow-hidden">
          {/* Left Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 z-10">
            <UploadPapersSidebar onPaperClick={handlePaperClickFromSidebar} onPaperDeleted={handlePaperDeleted} onAllPapersDeleted={handleAllPapersDeleted} />
          </div>

          {/* Center Content - Select a tab message */}
          <div className="absolute top-0 bottom-0 left-12 right-80 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md">
              <div className="inline-flex items-center justify-center rounded-full bg-royal-100 p-6 text-royal-500">
                <BookOpen className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">Select a Tab</h1>
                <p className="text-gray-500">
                  Click on one of the tabs above to view a paper.
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="absolute right-0 top-0 bottom-0 z-10">
            <CopilotChat
              isOpen={true}
              onClose={() => {
                setCopilotChatOpen(false);
                setCopilotAutoPrompt('');
              }}
              paperId={activePaperId}
              autoPrompt={copilotAutoPrompt}
              forceExpand={forceExpandCopilot}
            />
          </div>
        </div>
      </div>
    );
  }

  // Main content with current paper
  if (!currentPaper) {
    return null; // This should not happen due to above checks
  }

  return (
    <div className="flex flex-col h-screen bg-ivory">
      {/* Header */}
      <header className="border-b shadow-sm bg-white">
        <div className="flex h-16 items-center px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-royal-500 p-1.5 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-sans font-bold text-royal-500">
              Eureka
            </span>
          </Link>
          
          {/* Centered Navigation */}
          <div className="flex-1 flex justify-center">
            <nav className="flex gap-6">
              <Link href="/reader" className="font-sans font-bold text-royal-700 underline underline-offset-4">Reader</Link>
              <Link href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</Link>
              <Link href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</Link>
              <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
            </nav>
          </div>
          
          {/* Right spacer to balance the logo */}
          <div className="w-[140px]"></div>
        </div>
      </header>

              {/* Paper Tabs */}
        <PaperTabs
          papers={openPapers.map(p => ({ id: p.id, title: p.title }))}
          activePaperId={activePaperId}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
        />

        {/* Main Content with Sidebars */}
        <div className="flex-1 relative overflow-hidden">
          {/* Left Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 z-10">
            <UploadPapersSidebar onPaperClick={handlePaperClickFromSidebar} onPaperDeleted={handlePaperDeleted} onAllPapersDeleted={handleAllPapersDeleted} />
          </div>

          {/* Center Content - Always Centered */}
          <div className="absolute top-0 bottom-0 left-0 right-0 flex flex-col items-center justify-center overflow-auto">
            {currentPaper.filePath && (
              <div className="w-full max-w-6xl overflow-hidden relative">
                <PDFViewer 
                  url={currentPaper.filePath} 
                  fileName={currentPaper.originalName || currentPaper.title}
                  paperId={activePaperId}
                  onAddToCopilotChat={handleAddToCopilotChat}
                />
              </div>
            )}
            {/* Abstract and Sections - Centered (only if no PDF) */}
            {!currentPaper.filePath && (
              <div className="w-full max-w-6xl overflow-auto relative">
                <main className="py-8 px-4">
                  {/* Abstract */}
                  {currentPaper.abstract && (
                    <div className="mb-8">
                      <h2 className="text-xl font-semibold mb-4 text-gray-800">Abstract</h2>
                      <div className="text-gray-700 leading-relaxed bg-white p-6 rounded-lg border shadow-sm">
                        {currentPaper.abstract}
                      </div>
                    </div>
                  )}
                  {/* Paper Content - only show for mock data or extracted content */}
                  {currentPaper.sections && currentPaper.sections.length > 0 && (
                    <div className="space-y-8">
                      {currentPaper.sections.map((section: any, index: number) => (
                        <div key={index} className="space-y-4">
                          <h2 className="text-xl font-semibold text-gray-800">{section.title}</h2>
                          <div className="text-gray-700 leading-relaxed whitespace-pre-line bg-white p-6 rounded-lg border shadow-sm">
                            {section.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </main>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="absolute right-0 top-0 bottom-0 z-10">
            <CopilotChat
              isOpen={true}
              onClose={() => {
                setCopilotChatOpen(false);
                setCopilotAutoPrompt(''); // Clear auto-prompt when closing
              }}
              paperId={activePaperId}
              autoPrompt={copilotAutoPrompt}
              forceExpand={forceExpandCopilot}
            />
          </div>
        </div>
      </div>
    )
  }
