const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = "AIzaSyCN2Miixq9cTyf1QBom1Iu8-EcWH87jdN0";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    console.log("Fetching models...");
    
    // Instead of using genAI.getGenerativeModel which doesn't list, 
    // we need to call REST fetch manually if the SDK doesn't support listModels,
    // actually older SDK didn't, but wait, we can just do a raw fetch
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    console.log(data.models.map(m => m.name).join("\n"));
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listModels();
