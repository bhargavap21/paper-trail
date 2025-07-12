"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, CheckCircle, XCircle, BookOpen, Brain } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { use } from "react"

interface Question {
  id: number;
  type: "multiple_choice" | "true_false" | "short_answer";
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

interface Quiz {
  paperId: string;
  paperTitle: string;
  generatedAt: string;
  questions: Question[];
}

export default function QuizPage({ params }: { params: { paperId: string } }) {
  const unwrappedParams = use(params as any) as { paperId: string };
  const paperId = unwrappedParams.paperId;
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isDemoQuiz, setIsDemoQuiz] = useState(false);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<Record<number, boolean>>({});
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const generateQuiz = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/papers/${paperId}/quiz`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to generate quiz');
        }

        const data = await response.json();
        setQuiz(data.quiz);
        
        // Check if this is a demo quiz
        if (data.message && data.message.includes('Demo quiz')) {
          setIsDemoQuiz(true);
          toast({
            title: 'Demo Quiz Generated',
            description: 'This paper doesn\'t have extractable text, so we\'ve created a general research paper quiz for demonstration.',
            variant: 'default',
          });
        }
      } catch (error) {
        console.error('Error generating quiz:', error);
        toast({
          title: 'Error',
          description: 'Failed to generate quiz. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (paperId) {
      generateQuiz();
    }
  }, [paperId, toast]);

  const handleAnswerChange = (questionId: number, answer: string) => {
    // Don't allow changes if feedback is already shown (answer is locked)
    if (showAnswerFeedback[questionId]) {
      return;
    }
    
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // For multiple choice and true/false, show feedback immediately
    // For short answer, wait for explicit submission
    const currentQuestion = quiz?.questions.find(q => q.id === questionId);
    if (currentQuestion && currentQuestion.type !== "short_answer") {
      setShowAnswerFeedback(prev => ({
        ...prev,
        [questionId]: true
      }));
    }
  };

  const handleShortAnswerSubmit = (questionId: number) => {
    if (showAnswerFeedback[questionId]) {
      return;
    }
    
    // Show feedback and lock the short answer
    setShowAnswerFeedback(prev => ({
      ...prev,
      [questionId]: true
    }));
  };

  const handleNext = () => {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
    setQuizCompleted(true);
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    
    let correct = 0;
    quiz.questions.forEach((question) => {
      const userAnswer = userAnswers[question.id];
      if (userAnswer && userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()) {
        correct++;
      }
    });
    
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-royal-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-gray-600">Generating your quiz...</h2>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Quiz Not Available</h1>
          <p className="text-gray-500 mb-6">Unable to generate quiz for this paper.</p>
          <Link href={`/reader/${paperId}`}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Paper
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;
  
  // For short answer questions, consider answered only if feedback is shown (submitted)
  // For other questions, consider answered if there's a value
  const hasAnsweredCurrent = currentQ.type === "short_answer" 
    ? showAnswerFeedback[currentQ.id] 
    : userAnswers[currentQ.id] !== undefined;
    
  const showFeedbackForCurrent = showAnswerFeedback[currentQ.id];
  const userAnswerForCurrent = userAnswers[currentQ.id];
  const isCurrentAnswerCorrect = userAnswerForCurrent?.toLowerCase().trim() === currentQ.correct_answer.toLowerCase().trim();

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/reader/${paperId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Paper
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="bg-royal-500 p-1.5 rounded-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-royal-500">Quiz</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
                 {/* Paper Title */}
         <div className="mb-6">
           <h1 className="text-2xl font-bold text-gray-800 mb-2">
             Quiz: {quiz.paperTitle}
             {isDemoQuiz && (
               <span className="ml-2 text-sm bg-blue-100 text-blue-600 px-2 py-1 rounded">
                 Demo Quiz
               </span>
             )}
           </h1>
           <Progress value={progress} className="w-full" />
         </div>

        {!showResults ? (
          /* Quiz Questions */
          <Card className="mb-6 bg-white shadow-lg border">
            <CardHeader className="bg-gradient-to-r from-royal-50 to-blue-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <span className="bg-royal-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Question {currentQ.id}
                </span>
                <span className="text-royal-600 text-sm font-medium bg-white px-2 py-1 rounded">
                  {currentQ.type.replace('_', ' ').toUpperCase()}
                </span>
              </CardTitle>
              <CardDescription className="text-lg font-semibold text-gray-900 mt-3 leading-relaxed">
                {currentQ.question}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 bg-white">
              {currentQ.type === "multiple_choice" && currentQ.options && (
                <RadioGroup
                  value={userAnswers[currentQ.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                  className="space-y-4"
                  disabled={showFeedbackForCurrent}
                >
                  {currentQ.options.map((option, index) => {
                    const isSelected = userAnswers[currentQ.id] === option;
                    const isCorrect = option === currentQ.correct_answer;
                    const isLocked = showFeedbackForCurrent;
                    
                    let borderClass = "border-gray-200";
                    let bgClass = "hover:bg-gray-50";
                    let textClass = "text-gray-800";
                    
                    if (isLocked) {
                      if (isSelected && isCorrect) {
                        borderClass = "border-green-500 bg-green-50";
                        bgClass = "";
                        textClass = "text-green-800";
                      } else if (isSelected && !isCorrect) {
                        borderClass = "border-red-500 bg-red-50";
                        bgClass = "";
                        textClass = "text-red-800";
                      } else if (!isSelected && isCorrect) {
                        borderClass = "border-green-300 bg-green-25";
                        bgClass = "";
                        textClass = "text-green-700";
                      } else {
                        borderClass = "border-gray-300 bg-gray-100";
                        bgClass = "";
                        textClass = "text-gray-500";
                      }
                    }
                    
                    return (
                      <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${borderClass} ${isLocked ? '' : bgClass}`}>
                        <RadioGroupItem 
                          value={option} 
                          id={`option-${index}`} 
                          className="text-royal-500" 
                          disabled={isLocked}
                        />
                        <Label 
                          htmlFor={`option-${index}`} 
                          className={`${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'} ${textClass} font-medium flex-1`}
                        >
                          {option}
                          {isLocked && isCorrect && (
                            <span className="ml-2 text-green-600 font-bold">✓ Correct</span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}

              {currentQ.type === "true_false" && (
                <RadioGroup
                  value={userAnswers[currentQ.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                  className="space-y-4"
                  disabled={showFeedbackForCurrent}
                >
                  {["True", "False"].map((option) => {
                    const isSelected = userAnswers[currentQ.id] === option;
                    const isCorrect = option === currentQ.correct_answer;
                    const isLocked = showFeedbackForCurrent;
                    
                    let borderClass = "border-gray-200";
                    let bgClass = "hover:bg-gray-50";
                    let textClass = "text-gray-800";
                    
                    if (isLocked) {
                      if (isSelected && isCorrect) {
                        borderClass = "border-green-500 bg-green-50";
                        bgClass = "";
                        textClass = "text-green-800";
                      } else if (isSelected && !isCorrect) {
                        borderClass = "border-red-500 bg-red-50";
                        bgClass = "";
                        textClass = "text-red-800";
                      } else if (!isSelected && isCorrect) {
                        borderClass = "border-green-300 bg-green-25";
                        bgClass = "";
                        textClass = "text-green-700";
                      } else {
                        borderClass = "border-gray-300 bg-gray-100";
                        bgClass = "";
                        textClass = "text-gray-500";
                      }
                    }
                    
                    return (
                      <div key={option} className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${borderClass} ${isLocked ? '' : bgClass}`}>
                        <RadioGroupItem 
                          value={option} 
                          id={option.toLowerCase()} 
                          className="text-royal-500" 
                          disabled={isLocked}
                        />
                        <Label 
                          htmlFor={option.toLowerCase()} 
                          className={`${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'} ${textClass} font-medium text-lg flex-1`}
                        >
                          {option}
                          {isLocked && isCorrect && (
                            <span className="ml-2 text-green-600 font-bold">✓ Correct</span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}

              {currentQ.type === "short_answer" && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Enter your answer here..."
                    value={userAnswers[currentQ.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                    className={`min-h-[120px] text-white bg-gray-800 border-gray-600 focus:border-royal-500 focus:ring-royal-500 placeholder-gray-400 ${
                      showFeedbackForCurrent ? 'bg-gray-600 cursor-not-allowed' : ''
                    }`}
                    disabled={showFeedbackForCurrent}
                    readOnly={showFeedbackForCurrent}
                  />
                  {!showFeedbackForCurrent && userAnswers[currentQ.id] && userAnswers[currentQ.id].trim() && (
                    <Button
                      onClick={() => handleShortAnswerSubmit(currentQ.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Submit Answer
                    </Button>
                  )}
                  {showFeedbackForCurrent && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-medium text-green-800 mb-1">Correct Answer:</div>
                      <div className="text-green-700">{currentQ.correct_answer}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            {/* Immediate Answer Feedback */}
            {showFeedbackForCurrent && (
              <div className={`mx-6 mb-4 p-4 rounded-lg border-l-4 ${
                isCurrentAnswerCorrect 
                  ? 'bg-green-50 border-l-green-500 border border-green-200' 
                  : 'bg-red-50 border-l-red-500 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {isCurrentAnswerCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-medium ${
                    isCurrentAnswerCorrect ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {isCurrentAnswerCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Your answer: </span>
                    <span className={isCurrentAnswerCorrect ? 'text-green-700' : 'text-red-700'}>
                      {userAnswerForCurrent}
                    </span>
                  </div>
                  
                  {!isCurrentAnswerCorrect && (
                    <div>
                      <span className="font-medium">Correct answer: </span>
                      <span className="text-green-700 font-medium">
                        {currentQ.correct_answer}
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-3 p-3 bg-gray-50 rounded text-gray-700">
                    <span className="font-medium">Explanation: </span>
                    {currentQ.explanation}
                  </div>
                </div>
              </div>
            )}

            <CardFooter className="flex justify-between bg-gray-50 border-t p-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className="border-gray-300 text-white bg-gray-600 hover:bg-gray-700 hover:text-white"
              >
                Previous
              </Button>

              <div className="flex gap-2">
                {!isLastQuestion ? (
                  <Button
                    onClick={handleNext}
                    disabled={!hasAnsweredCurrent}
                    className="bg-royal-500 hover:bg-royal-600 text-white px-6"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitQuiz}
                    disabled={!hasAnsweredCurrent}
                    className="bg-green-600 hover:bg-green-700 text-white px-6"
                  >
                    Submit Quiz
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ) : (
          /* Results */
          <div className="space-y-6">
            {/* Score Summary */}
            <Card className="bg-white shadow-lg border">
              <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-2xl text-gray-900">Quiz Complete!</CardTitle>
                <CardDescription>
                  <span className={`text-3xl font-bold ${getScoreColor(calculateScore())}`}>
                    {calculateScore()}%
                  </span>
                  <div className="text-sm text-gray-700 mt-2">
                    You got {quiz.questions.filter(q => 
                      userAnswers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()
                    ).length} out of {quiz.questions.length} questions correct
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Question Review */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Review Your Answers</h2>
              {quiz.questions.map((question, index) => {
                const userAnswer = userAnswers[question.id];
                const isCorrect = userAnswer?.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
                
                return (
                  <Card key={question.id} className={`bg-white shadow-lg border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                      <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        Question {question.id}
                      </CardTitle>
                      <CardDescription className="font-medium text-gray-800">
                        {question.question}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 p-6 bg-white">
                      <div>
                        <span className="font-medium text-gray-900">Your answer: </span>
                        <span className={`font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {userAnswer || 'No answer provided'}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div>
                          <span className="font-medium text-gray-900">Correct answer: </span>
                          <span className="text-green-600 font-medium">{question.correct_answer}</span>
                        </div>
                      )}
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm">
                        <span className="font-medium text-gray-900">Explanation: </span>
                        <span className="text-gray-800">{question.explanation}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <Link href={`/reader/${paperId}`}>
                <Button variant="outline" className="border-gray-300 text-gray-700 bg-white hover:bg-gray-50">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Back to Paper
                </Button>
              </Link>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-royal-500 hover:bg-royal-600 text-white"
              >
                <Brain className="mr-2 h-4 w-4" />
                Retake Quiz
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 