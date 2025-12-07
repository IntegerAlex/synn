// Error handling utilities

export class GitError extends Error {
    constructor(
        public code: string,
        message: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'GitError';
    }
}

export const Errors = {
    repoNotFound: (path: string) =>
        new GitError('REPO_NOT_FOUND', `Repository not found at: ${path}`, { path }),

    notAGitRepo: (path: string) =>
        new GitError('NOT_A_GIT_REPO', `Not a git repository: ${path}`, { path }),

    repoNotSet: () =>
        new GitError('REPO_NOT_SET', 'No repository is currently set'),

    commitNotFound: (hash: string) =>
        new GitError('COMMIT_NOT_FOUND', `Commit not found: ${hash}`, { hash }),

    branchNotFound: (name: string) =>
        new GitError('BRANCH_NOT_FOUND', `Branch not found: ${name}`, { name }),

    operationFailed: (operation: string, details?: string) =>
        new GitError('OPERATION_FAILED', `${operation} failed${details ? `: ${details}` : ''}`, { operation }),
};

export function formatErrorResponse(error: unknown) {
    if (error instanceof GitError) {
        return {
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
            },
        };
    }

    if (error instanceof Error) {
        return {
            error: {
                code: 'UNKNOWN_ERROR',
                message: error.message,
            },
        };
    }

    return {
        error: {
            code: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred',
        },
    };
}
