import { connectToDatabase, dbModels, genAI } from './config';
import { ObjectId } from 'mongodb';

interface Paper {
  _id?: ObjectId;
  title: string;
  authors: string[];
  abstract: string;
  content: string;
  url?: string;
  filePath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function processPaperUpload(file: File | string, isUrl: boolean = false): Promise<Paper> {
  const db = await connectToDatabase();
  const papersCollection = db.collection(dbModels.papers);

  // Initialize paper object
  const paper: Paper = {
    title: '',
    authors: [],
    abstract: '',
    content: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (isUrl) {
    paper.url = file as string;
    // TODO: Implement URL paper fetching logic
  } else {
    const fileData = file as File;
    paper.filePath = `/uploads/${fileData.name}`;
    // TODO: Implement file upload and processing logic
  }

  // Use Gemini API to extract information
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  try {
    // Extract title and authors
    const titlePrompt = `Extract the title and authors from this research paper: ${paper.content.substring(0, 1000)}`;
    const titleResult = await model.generateContent(titlePrompt);
    const titleResponse = await titleResult.response;
    const titleText = titleResponse.text();
    
    // Extract abstract
    const abstractPrompt = `Extract the abstract from this research paper: ${paper.content}`;
    const abstractResult = await model.generateContent(abstractPrompt);
    const abstractResponse = await abstractResult.response;
    const abstractText = abstractResponse.text();

    // Update paper object with extracted information
    paper.title = titleText.split('\n')[0];
    paper.authors = titleText.split('\n')[1]?.split(',').map(author => author.trim()) || [];
    paper.abstract = abstractText;

    // Save to MongoDB
    const result = await papersCollection.insertOne(paper);
    paper._id = result.insertedId;

    return paper;
  } catch (error) {
    console.error('Error processing paper:', error);
    throw error;
  }
}

export async function getPaperById(id: string): Promise<Paper | null> {
  const db = await connectToDatabase();
  const papersCollection = db.collection(dbModels.papers);
  
  try {
    const paper = await papersCollection.findOne({ _id: new ObjectId(id) });
    return paper as Paper | null;
  } catch (error) {
    console.error('Error fetching paper:', error);
    throw error;
  }
}

export async function getAllPapers(): Promise<Paper[]> {
  const db = await connectToDatabase();
  const papersCollection = db.collection(dbModels.papers);
  
  try {
    const papers = await papersCollection.find().toArray();
    return papers as Paper[];
  } catch (error) {
    console.error('Error fetching papers:', error);
    throw error;
  }
} 