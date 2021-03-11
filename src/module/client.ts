import http from 'axios'
interface IUploadOptions {
  blobStartingByte?: number
}
interface IEventListener {
  completed: (result: any) => void
  progress: (progress: number) => void
  error: (error: Error) => void
  abort: (status: boolean) => void
}
interface IOptions {
  fileUploadEndpoint: string,
  fileLoadedEndpoint: string,
}
class BlobUploader {
  private fileId = ''
  private isAborted = false
  private filesize = 0
  private fileName = ''
  private totalLoaded = 0
  private selectedFile!: File
  private chunkSize = ((1024 * 1024) * 10) // 10mb
  private eventListener = {
    completed: () => {},
    error: () => {},
    progress: () => {},
    abort: () => {},
  } as IEventListener

  constructor (private readonly deps: IOptions) {}
  /**
   * upload the selected file
   * @param file 
   * @param blobName 
   * @param options 
   */
  public upload (file: File, blobName: string, options?: IUploadOptions) {
    const {
      blobStartingByte = 0
    } = options || {}
    this.fileId = blobName
    this.filesize = file.size
    this.fileName = file.name
    this.selectedFile = file
    this.chunkUploader(blobStartingByte)
  }
  /**
   * chunk the selected file and then upload it thru server.
   * @param blobStartingByte 
   */
  private chunkUploader (blobStartingByte: number) {
    let blobByteLength = this.filesize >= (blobStartingByte + this.chunkSize) ? (blobStartingByte + this.chunkSize) : this.filesize
    this.uploadToServer(this.selectedFile.slice(blobStartingByte, blobByteLength))
      .then(() => {
        if (!this.isAborted && blobByteLength < this.filesize) {
          return this.chunkUploader(blobByteLength)
        }
        return true
      })
  }
  /**
   * upload the chunked blob to the server
   * @param file 
   */
  private uploadToServer = async (chunkedBlob: Blob) => {
    return new Promise((resolve) => {
      const request = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('blob', chunkedBlob, this.fileName)
      request.open("POST", this.deps.fileUploadEndpoint, true)
      request.setRequestHeader('X-File-Id', this.fileId)
      request.setRequestHeader('X-File-Size', this.filesize.toString())

      request.onload = (ev) => {
        resolve(true)
        this.eventListener.completed(ev)
      }

      request.upload.onprogress = (ev) => {
        // computation
        this.eventListener.progress(0)
      }
      request.onerror = (e: any) => this.eventListener.error(e)
      
      request.onabort = (e: any) => this.eventListener.abort(true)

      request.ontimeout = (e: any) => this.eventListener.error(e)
      
      request.send(formData);
    })
  }

  public resume (fileId: string, uploadedFile: File) {
    this.isAborted = false
    http({
      url: `${this.deps.fileLoadedEndpoint}?fileId=${fileId}`,
      method: "GET"
    })
    // .then((response) => response.json())
    .then((response) => {
      console.log('data :>> ', response.data);
      this.upload(uploadedFile, fileId, {
        blobStartingByte: response.data.totalBytesUploaded
      })
    })
  }
  public abort () {
    this.isAborted = true
  }
  /**
   * event listener
   * @param event 
   * @param callback 
   */
  public on(event: keyof IEventListener, callback:(result: any) => void = (data: any) => {}): void {
    this.eventListener[event] = callback
    // switch (event) {
    //   case "completed":
    //     this.callbackListener = callback
    //     // this.onComplete = callback
    //     break;
    //   case "progress":
    //     callback = this.onProgress
    //     break;
    //   case "error":
    //     callback = this.onError
    //     break;
    //   case "abort":
    //     callback = this.onAbort
    //     break;
    //   default:
    //     break
    // }
  }
}
export default BlobUploader