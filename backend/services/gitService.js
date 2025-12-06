const simpleGit = require('simple-git');
const fs = require('fs');

let gitInstance = null;

const setRepoPath = (path) => {
    if (!fs.existsSync(path)) {
        throw new Error('Path does not exist');
    }
    gitInstance = simpleGit(path);
    return { message: 'Repository path set', path };
};

const checkRepo = () => {
    if (!gitInstance) {
        throw new Error('Repository path not set');
    }
};

const getStatus = async () => {
    checkRepo();
    return await gitInstance.status();
};

const getBranches = async () => {
    checkRepo();
    return await gitInstance.branchLocal();
};

const getLog = async () => {
    checkRepo();
    // Get log with graph structure info if possible, or just standard log
    // We can use '--graph' but parsing it is hard.
    // simple-git log returns a list of commits.
    // We'll fetch all commits.
    return await gitInstance.log(['--all', '--date=iso']);
};

const getCommitDetails = async (hash) => {
    checkRepo();
    return await gitInstance.show([hash, '--stat']);
};

module.exports = {
    setRepoPath,
    getStatus,
    getBranches,
    getLog,
    getCommitDetails
};
