import { NextResponse } from 'next/server';
import { genAI } from '@/lib/config';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const paperId = resolvedParams.id;

    console.log('=== QUIZ GENERATION API CALLED ===');
    console.log('Paper ID:', paperId);

    if (!paperId) {
      return new NextResponse('Paper ID is required', { status: 400 });
    }

    // Get paper content from the database/API
    console.log('Fetching paper data...');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
    const paperResponse = await fetch(`${baseUrl}/api/papers/${paperId}`, {
      method: 'GET',
    });

    if (!paperResponse.ok) {
      console.error('Failed to fetch paper:', paperResponse.status, paperResponse.statusText);
      throw new Error('Failed to fetch paper');
    }

    const paperData = await paperResponse.json();
    const paper = paperData.paper;

    if (!paper) {
      console.error('Paper not found in response');
      return new NextResponse('Paper not found', { status: 404 });
    }

    console.log('Paper fetched successfully:', paper.title);

    // Prepare paper content for AI
    let paperContent = `Title: ${paper.title}\n\n`;
    
    if (paper.abstract && paper.abstract.trim()) {
      paperContent += `Abstract: ${paper.abstract}\n\n`;
    }

    if (paper.sections && paper.sections.length > 0) {
      paperContent += 'Content:\n';
      paper.sections.forEach((section: any) => {
        paperContent += `${section.title}:\n${section.content}\n\n`;
      });
    }

    // Add any additional content from the paper
    if (paper.content && paper.content.trim()) {
      paperContent += `Content: ${paper.content}\n\n`;
    }

    // Add author information
    if (paper.authors && paper.authors.length > 0) {
      paperContent += `Authors: ${Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}\n`;
    }
    
    if (paper.venue && paper.year) {
      paperContent += `Published: ${paper.venue}, ${paper.year}\n`;
    }

    // Check if we have enough content to generate a meaningful quiz
    const hasMinimalContent = paper.abstract?.trim() || (paper.sections && paper.sections.length > 0) || paper.content?.trim();
    
    if (!hasMinimalContent) {
      console.log('Insufficient content for quiz generation, generating intelligent quiz based on paper metadata');
      
      // Generate a more intelligent quiz using the paper title and available information
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      try {
        const paperInfo = `
Paper Title: ${paper.title}
File Name: ${paper.originalName || paper.title}
Authors: ${Array.isArray(paper.authors) && paper.authors.length > 0 ? paper.authors.join(', ') : 'Not specified'}
Publication Info: ${paper.venue && paper.year ? `${paper.venue}, ${paper.year}` : 'Not specified'}
`;

        // Check if the title is generic (like research_paper_1, etc.)
        const isGenericTitle = /^(research_paper_|paper_|document_|file_)/i.test(paper.title) || 
                              paper.title.length < 5 ||
                              /^\d+$/.test(paper.title);

        let prompt;
        if (isGenericTitle) {
          prompt = `This research paper has a generic title "${paper.title}" and no extractable content. Since we cannot determine the specific research area, create a comprehensive 10-question quiz about fundamental research methodology, scientific writing, and academic practices that would apply to ANY research paper.

Include questions about:
- Research design and methodology
- Data collection and analysis
- Academic writing standards
- Research ethics and integrity
- Literature review processes
- Statistical concepts
- Publication and peer review
- Research evaluation criteria

Make it educational and cover essential knowledge that researchers in any field should know.

Generate a mix of multiple choice, true/false, and short answer questions.`;
        } else {
          prompt = `Based on this research paper information, create a 10-question quiz that tests understanding of what this specific paper likely covers. Use the title to infer the topic area and create relevant questions. Include a mix of multiple choice, true/false, and short answer questions.

${paperInfo}

Generate questions that are:
1. Specific to the apparent topic/field based on the title
2. Educational about the likely research area
3. Mix of conceptual and methodological questions
4. Appropriate for the subject matter suggested by the title`;
        }

        prompt += `

Format as JSON:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice" | "true_false" | "short_answer",
      "question": "Question text",
      "options": ["A", "B", "C", "D"] (only for multiple choice),
      "correct_answer": "Correct answer",
      "explanation": "Brief explanation"
    }
  ]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        let quizData;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            quizData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (parseError) {
          console.error('Failed to parse Gemini response, using fallback');
          // Use the original demo quiz as fallback
          quizData = {
            questions: [
              {
                id: 1,
                type: "multiple_choice",
                question: `Based on the title "${paper.title}", what is the likely primary focus of this research?`,
                options: ["Theoretical analysis", "Experimental study", "Literature review", "Methodology development"],
                correct_answer: "Experimental study",
                explanation: "Most research papers with specific titles focus on experimental studies or new findings."
              },
              {
                id: 2,
                type: "short_answer",
                question: `What research field does "${paper.title}" most likely belong to?`,
                correct_answer: "Based on the title, this appears to be in a specific research domain",
                explanation: "Research papers typically belong to specific academic fields based on their titles and focus."
              },
              {
                id: 3,
                type: "true_false",
                question: "Research papers with specific titles like this typically present original research findings.",
                correct_answer: "True",
                explanation: "Papers with specific titles usually report on original research rather than general reviews."
              },
              {
                id: 4,
                type: "multiple_choice",
                question: "What would you expect to find in the methodology section of this paper?",
                options: ["Data collection methods", "Theoretical frameworks", "Literature citations", "All of the above"],
                correct_answer: "All of the above",
                explanation: "Research papers typically include comprehensive methodology sections covering various aspects."
              },
              {
                id: 5,
                type: "short_answer",
                question: "What type of conclusions would you expect from this research?",
                correct_answer: "Specific findings related to the research question posed in the title",
                explanation: "Research conclusions should directly address the research questions implied by the paper's title."
              }
            ]
          };
        }

        const intelligentQuiz = {
          paperId: paperId,
          paperTitle: paper.title || 'Research Paper',
          generatedAt: new Date().toISOString(),
          ...quizData
        };

        return NextResponse.json({ 
          quiz: intelligentQuiz,
          message: "Intelligent quiz generated based on paper title and metadata - Full text extraction not available for this PDF."
        }, { status: 200 });

      } catch (error) {
        console.error('Error generating intelligent quiz:', error);
        
        // Final fallback to basic demo quiz
        const demoQuiz = {
          paperId: paperId,
          paperTitle: paper.title || 'Research Paper',
          generatedAt: new Date().toISOString(),
          questions: [
            {
              id: 1,
              type: "multiple_choice",
              question: "What is the primary purpose of this research paper?",
              options: ["To present new findings", "To review existing literature", "To propose a new method", "To critique existing work"],
              correct_answer: "To present new findings",
              explanation: "Most research papers aim to present new findings or insights to the scientific community."
            },
            {
              id: 2,
              type: "true_false",
              question: "Research papers typically include an abstract that summarizes the main points.",
              correct_answer: "True",
              explanation: "Abstracts are standard components of research papers that provide a concise summary of the work."
            },
            {
              id: 3,
              type: "short_answer",
              question: "What are the main sections typically found in a research paper?",
              correct_answer: "Introduction, Methods, Results, Discussion, Conclusion",
              explanation: "The IMRAD structure (Introduction, Methods, Results, and Discussion) is commonly used in research papers."
            }
          ]
        };

        return NextResponse.json({ 
          quiz: demoQuiz,
          message: "Basic demo quiz generated - Unable to access paper content or generate specific questions."
        }, { status: 200 });
      }
    }

    // Generate quiz using Gemini
    console.log('Generating quiz with Gemini...');
    console.log('Paper content length:', paperContent.length);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Based on the following research paper, create a 10-question quiz to test understanding of the key concepts, methods, and findings. Include a mix of multiple choice, true/false, and short answer questions. For each question, provide the correct answer and a brief explanation.

Paper content:
${paperContent}

Please format your response as a JSON object with this structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice" | "true_false" | "short_answer",
      "question": "Question text",
      "options": ["A", "B", "C", "D"] (only for multiple choice),
      "correct_answer": "Correct answer",
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Focus on:
- Key concepts and terminology
- Research methodology
- Main findings and conclusions
- Implications and applications
- Technical details that are important to understand

Make sure questions are clear, educational, and test real understanding rather than just memorization.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini response received, length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));

    // Parse the JSON response
    let quizData;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Raw response:', text);
      
      // Fallback: create a simple quiz structure
      quizData = {
        questions: [
          {
            id: 1,
            type: "short_answer",
            question: `What is the main contribution of the paper "${paper.title}"?`,
            correct_answer: "Based on the abstract and content of the paper",
            explanation: "This question tests understanding of the paper's core contribution."
          },
          {
            id: 2,
            type: "multiple_choice",
            question: "What type of research paper is this?",
            options: ["Theoretical", "Empirical", "Survey", "Technical"],
            correct_answer: "Based on the methodology described",
            explanation: "Classification based on the paper's approach and methodology."
          }
        ]
      };
    }

    // Add metadata
    const quiz = {
      paperId: paperId,
      paperTitle: paper.title,
      generatedAt: new Date().toISOString(),
      ...quizData
    };

    return NextResponse.json({ quiz }, { status: 200 });

  } catch (error) {
    console.error('Quiz generation error:', error);
    return new NextResponse(
      `Failed to generate quiz: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
} 