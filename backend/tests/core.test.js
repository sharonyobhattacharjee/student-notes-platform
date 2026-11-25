
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  hashToken,
  randomToken,
  hashPassword,
  comparePassword,
  sha256,
  isSha256Hash
} from "../src/security.js";

import { validateUploadedFile } from "../src/fileValidation.js";

// --------------------------------------------------
// TOKEN SECURITY
// --------------------------------------------------

test("token hashing is deterministic", () => {
  assert.equal(hashToken("test-token"), hashToken("test-token"));

  assert.notEqual(
    hashToken("test-token"),
    hashToken("another-token")
  );
});

test("random tokens are unique and URL-safe", () => {
  const first = randomToken();
  const second = randomToken();

  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.ok(first.length >= 40);
});

test("random tokens do not contain predictable values", () => {
  const tokens = new Set(
    Array.from({ length: 100 }, () => randomToken())
  );

  assert.equal(tokens.size, 100);
});

// --------------------------------------------------
// PASSWORD SECURITY
// --------------------------------------------------

test("password hashing produces a different value from plaintext", async () => {
  const password = "StrongPassword123!";

  const passwordHash = await hashPassword(password);

  assert.notEqual(passwordHash, password);
  assert.ok(passwordHash.length > 30);
});

test("correct password matches its hash", async () => {
  const password = "StrongPassword123!";

  const passwordHash = await hashPassword(password);

  assert.equal(
    await comparePassword(password, passwordHash),
    true
  );
});

test("incorrect password does not match its hash", async () => {
  const passwordHash = await hashPassword("CorrectPassword123!");

  assert.equal(
    await comparePassword("WrongPassword123!", passwordHash),
    false
  );
});

test("password hashes use bcrypt format", async () => {
  const passwordHash = await hashPassword("StrongPassword123!");

  assert.match(passwordHash, /^\$2[aby]\$/);
});

// --------------------------------------------------
// SHA-256 CHECKSUM
// --------------------------------------------------

test("SHA-256 produces a valid 64-character hexadecimal hash", () => {
  const checksum = sha256("sample content");

  assert.match(checksum, /^[a-f0-9]{64}$/);
  assert.equal(isSha256Hash(checksum), true);
});

test("SHA-256 produces consistent results", () => {
  assert.equal(
    sha256("same content"),
    sha256("same content")
  );

  assert.notEqual(
    sha256("first content"),
    sha256("second content")
  );
});

test("invalid SHA-256 values are rejected", () => {
  assert.equal(isSha256Hash("not-a-hash"), false);
  assert.equal(isSha256Hash(""), false);
  assert.equal(isSha256Hash("12345"), false);
});

// --------------------------------------------------
// FILE VALIDATION
// --------------------------------------------------

test("valid PDF upload is accepted and SHA-256 is returned", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "notes-test-")
  );

  const filePath = path.join(directory, "sample.pdf");

  try {
    await fs.writeFile(
      filePath,
      "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"
    );

    const result = await validateUploadedFile({
      originalname: "sample.pdf",
      path: filePath,
      size: (await fs.stat(filePath)).size
    });

    assert.equal(result.ext, "pdf");
    assert.equal(result.mime, "application/pdf");
    assert.match(result.checksum, /^[a-f0-9]{64}$/);
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true
    });
  }
});

test("unsupported file extensions are rejected", async () => {
  await assert.rejects(
    validateUploadedFile({
      originalname: "malware.exe",
      path: "/does/not/need/to/exist",
      size: 100
    }),
    /Only PDF, DOCX and PPTX files are allowed/
  );
});

test("empty uploads are rejected", async () => {
  await assert.rejects(
    validateUploadedFile({
      originalname: "empty.pdf",
      path: "/does/not/need/to/exist",
      size: 0
    }),
    /uploaded file is empty/
  );
});

test("files with a PDF extension but invalid content are rejected", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "notes-test-")
  );

  const filePath = path.join(directory, "fake.pdf");

  try {
    await fs.writeFile(filePath, "This is not a PDF file");

    await assert.rejects(
      validateUploadedFile({
        originalname: "fake.pdf",
        path: filePath,
        size: (await fs.stat(filePath)).size
      }),
      /content does not match/
    );
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true
    });
  }
});
