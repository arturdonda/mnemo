export class MnemoError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1
  ) {
    super(message);
    this.name = 'MnemoError';
  }
}

export function handleError(e: unknown): never {
  if (e instanceof MnemoError) {
    console.error(`Error: ${e.message}`);
    process.exit(e.exitCode);
  } else if (e instanceof Error) {
    console.error(`Unexpected error: ${e.message}`);
  } else {
    console.error('An unexpected error occurred.');
  }
  process.exit(1);
}
