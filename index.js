import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(express.static(path.join(__dirname,'public')));


app.get("/",(req,res)=>{
    res.render("index.ejs");
});

app.get("/results", (req, res) => {
    res.render("result.ejs");
});

app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
})