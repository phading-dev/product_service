import { createWriteStream } from "fs";
import { Writable } from "stream";

export class FakeFile {
  public constructor(private filename: string) {
  }

  public createWriteStream(): Writable {
    return createWriteStream(this.filename);
  }
}

export class FakeBucket {
  public file(filename: string): FakeFile {
    return new FakeFile(filename);
  }
}
