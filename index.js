import express from 'express';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.MONGO_CONNECTION_STRING;
const client = new MongoClient(url);

async function main() {
    await client.connect();
    const db = client.db(process.env.DATABASE_NAME);
    const scoresCollection = db.collection('scores');

    const app = express();
    const port = 3000;

    app.use(express.json());

    app.get('/api/scores', async (req, res) => {
        try {
            const scores = await scoresCollection.find({}).toArray();
            res.send(scores);
        } catch (err) {
            res.status(400).send(err.message);
        }
    });

    app.post('/api/scores', async (req, res) => {
        const score = req.body;
        if (Object.keys(score).find(key => !['name', 'score', 'level'].includes(key))) {
            res.status(400).send('Found unknown keys!');
            return;
        }
        if (typeof score.name !== 'string' || score.name.length === 0 || score.name.length > 100) {
            res.status(400).send('Invalid name');
            return;
        }
        if (typeof score.score !== 'number' || score.score < 1) {
            res.status(400).send('Invalid score');
            return;
        }
        if (typeof score.level !== 'number' || score.level < 0) {
            res.status(400).send('Invalid level');
            return;
        }
        try {
            const document = await scoresCollection.insertOne(score);
            res.status(201).send(document);
        } catch (err) {
            res.status(400).send(err.message);
        }
    });

    app.get('/api/scores/:level', async (req, res) => {
        const level = parseInt(req.params.level, 10);
        try {
            const scores = await scoresCollection.find({ level: level }).toArray();
            res.send(scores);
        } catch (err) {
            res.status(400).send(err.message);
        }
    });

    app.use(express.static('public'));

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
}

main().catch(console.error);