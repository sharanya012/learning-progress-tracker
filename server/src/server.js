
import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

// Test API endpoint
app.get("/api/health", (req, res) => {
    res.json({
        message: "Learning Progress Tracker API is running!"
    });
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
