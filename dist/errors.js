export class ApiError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
    }
}
export class BadRequestError extends ApiError {
    constructor(message) {
        super(message, 400);
    }
}
export class UnauthorizedError extends ApiError {
    constructor(message) {
        super(message, 401);
    }
}
export class ForbiddenError extends ApiError {
    constructor(message) {
        super(message, 403);
    }
}
export class NotFoundError extends ApiError {
    constructor(message) {
        super(message, 404);
    }
}
