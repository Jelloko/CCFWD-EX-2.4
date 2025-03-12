require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(fileUpload());
app.use(express.static('public')); // Serve static files

// S3 Client Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: undefined // EC2 IAM role will be used
});



const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Serve HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚀 **List All Objects in the S3 Bucket**
app.get('/api/images', async (req, res) => {
    try {
        const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
        const response = await s3Client.send(command);
        res.json(response.Contents || []);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to list objects' });
    }
});

// 🚀 **Upload an Object to the S3 Bucket**
app.post('/api/upload', async (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.files.image;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: file.name,
            Body: file.data,
            ContentType: file.mimetype,
        });

        await s3Client.send(command);
        res.json({ message: `File uploaded: ${file.name}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

// 🚀 **Retrieve an Object from the S3 Bucket**
app.get('/api/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename,
        });

        const response = await s3Client.send(command);

        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', response.ContentType);
        response.Body.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'File retrieval failed' });
    }
});

// Start Server
app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://0.0.0.0:3000");
});


