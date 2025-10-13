import Hashids from "hashids";

const hashids = new Hashids("your-secret-salt", 10); // min length 10 추천

export function encodeAssignmentToken(assignmentId: number, classId: number): string {
  return hashids.encode(assignmentId, classId);
}

export function decodeAssignmentToken(token: string): [number, number] | null {
  const decoded = hashids.decode(token);
  if (decoded.length !== 2) return null;
  return [Number(decoded[0]), Number(decoded[1])]; // [assignmentId, classId]
}

export function encodeAssignmentStudentToken(
  assignmentId: number,
  classId: number,
  studentId: number
): string {
  return hashids.encode(assignmentId, classId, studentId);
}

export function decodeAssignmentStudentToken(
  token: string
): [number, number, number] | null {
  const decoded = hashids.decode(token);
  if (decoded.length !== 3) return null;
  return [Number(decoded[0]), Number(decoded[1]), Number(decoded[2])]; // [assignmentId, classId, studentId]
}

export function encodeEvaluationToken(evaluationId: number, classId: number): string {
  return hashids.encode(evaluationId, classId);
}

export function decodeEvaluationToken(token: string): [number, number] | null {
  const decoded = hashids.decode(token);
  if (decoded.length !== 2) return null;
  return [Number(decoded[0]), Number(decoded[1])]; // [evaluationId, classId]
}

export function encodeEvaluationStudentToken(
  evaluationId: number,
  classId: number,
  studentId: number
): string {
  return hashids.encode(evaluationId, classId, studentId);
}

export function decodeEvaluationStudentToken(
  token: string
): [number, number, number] | null {
  const decoded = hashids.decode(token);
  if (decoded.length !== 3) return null;
  return [Number(decoded[0]), Number(decoded[1]), Number(decoded[2])]; // [evaluationId, classId, studentId]
}

export function encodeStudentToken(studentId: number): string {
  return hashids.encode(studentId);
}

export function decodeStudentToken(token: string): number | null {
  const decoded = hashids.decode(token);
  if (decoded.length !== 1) return null;
  return Number(decoded[0]);
}
