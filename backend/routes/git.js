const express = require('express');
const router = express.Router();
const gitService = require('../services/gitService');

router.post('/repo', async (req, res) => {
    try {
        const { path } = req.body;
        const result = gitService.setRepoPath(path);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/status', async (req, res) => {
    try {
        const status = await gitService.getStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/branches', async (req, res) => {
    try {
        const branches = await gitService.getBranches();
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/log', async (req, res) => {
    try {
        const log = await gitService.getLog();
        res.json(log);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/commit/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const details = await gitService.getCommitDetails(hash);
        res.json({ details });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
