import path from "path";
import { createWriteStream } from "fs";
import { Writable } from "stream";

export class FileFake {
  public constructor(
    private bucketName: string,
    private filename: string,
  ) {}
  public createWriteStream(): Writable {
    return createWriteStream(path.join(this.bucketName, this.filename));
  }
  public publicUrl(): string {
    return this.filename;
  }
  public delete(): void {}
  public getSignedUrl(): [string] {
    return [this.filename];
  }
}

export class BucketFake {
  public constructor(private bucketName: string) {}

  public file(filename: string): FileFake {
    return new FileFake(this.bucketName, filename);
  }
}

export class StorageFake {
  public bucket(bucketName: string): BucketFake {
    return new BucketFake(bucketName);
  }
}
