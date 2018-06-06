/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */

'use strict';

// $FlowFixMe: not defined by Flow
const constants = require('constants');
const path = require('path');
const stream = require('stream');

















































const FLAGS_SPECS =







{
  r: { mustExist: true, readable: true },
  'r+': { mustExist: true, readable: true, writable: true },
  'rs+': { mustExist: true, readable: true, writable: true },
  w: { truncate: true, writable: true },
  wx: { exclusive: true, truncate: true, writable: true },
  'w+': { readable: true, truncate: true, writable: true },
  'wx+': { exclusive: true, readable: true, truncate: true, writable: true } };


const ASYNC_FUNC_NAMES = [
'close',
'open',
'read',
'readdir',
'readFile',
'realpath',
'stat',
'write',
'writeFile'];


/**
                                           * Simulates `fs` API in an isolated, memory-based filesystem. This is useful
                                           * for testing systems that rely on `fs` without affecting the real filesystem.
                                           * This is meant to be a drop-in replacement/mock for `fs`, so it mimics
                                           * closely the behavior of file path resolution and file accesses.
                                           */
class MemoryFs {
























































  constructor() {this.

























    closeSync = fd => {
      this._fds.delete(fd);
    };this.

    openSync = (
    filePath,
    flags,
    mode) =>
    {
      if (typeof flags === 'number') {
        throw new Error(`numeric flags not supported: ${flags}`);
      }
      return this._open(pathStr(filePath), flags, mode);
    };this.

    readSync = (
    fd,
    buffer,
    offset,
    length,
    position) =>
    {
      const desc = this._fds.get(fd);
      if (desc == null) {
        throw makeError('EBADF', null, 'file descriptor is not open');
      }
      if (!desc.readable) {
        throw makeError('EBADF', null, 'file descriptor cannot be written to');
      }
      if (position != null) {
        desc.position = position;
      }
      const endPos = Math.min(desc.position + length, desc.node.content.length);
      desc.node.content.copy(buffer, offset, desc.position, endPos);
      const bytesRead = endPos - desc.position;
      desc.position = endPos;
      return bytesRead;
    };this.

    readdirSync = (
    filePath,
    options) =>




    {
      let encoding;
      if (typeof options === 'string') {
        encoding = options;
      } else if (options != null) {
        encoding = options.encoding;
      }
      filePath = pathStr(filePath);var _resolve =
      this._resolve(filePath);const node = _resolve.node;
      if (node == null) {
        throw makeError('ENOENT', filePath, 'no such file or directory');
      }
      if (node.type !== 'directory') {
        throw makeError('ENOTDIR', filePath, 'not a directory');
      }
      return Array.from(node.entries.keys()).map(str => {
        if (encoding === 'utf8') {
          return str;
        }
        const buffer = Buffer.from(str);
        if (encoding === 'buffer') {
          return buffer;
        }
        return buffer.toString(encoding);
      });
    };this.

    readFileSync = (
    filePath,
    options) =>





    {
      let encoding, flag;
      if (typeof options === 'string') {
        encoding = options;
      } else if (options != null) {
        encoding = options.encoding;flag = options.flag;
      }
      const fd = this._open(pathStr(filePath), flag || 'r');
      const chunks = [];
      try {
        const buffer = new Buffer(1024);
        let bytesRead;
        do {
          bytesRead = this.readSync(fd, buffer, 0, buffer.length, null);
          if (bytesRead === 0) {
            continue;
          }
          const chunk = new Buffer(bytesRead);
          buffer.copy(chunk, 0, 0, bytesRead);
          chunks.push(chunk);
        } while (bytesRead > 0);
      } finally {
        this.closeSync(fd);
      }
      const result = Buffer.concat(chunks);
      if (encoding == null) {
        return result;
      }
      return result.toString(encoding);
    };this.

    realpathSync = filePath => {
      return this._resolve(pathStr(filePath)).realpath;
    };this.

    writeSync = (
    fd,
    bufferOrString,
    offsetOrPosition,
    lengthOrEncoding,
    position) =>
    {
      let encoding, offset, length, buffer;
      if (typeof bufferOrString === 'string') {
        position = offsetOrPosition;
        encoding = lengthOrEncoding;
        buffer = Buffer.from(
        bufferOrString,
        encoding || 'utf8');

      } else {
        offset = offsetOrPosition;
        if (lengthOrEncoding != null && typeof lengthOrEncoding !== 'number') {
          throw new Error('invalid length');
        }
        length = lengthOrEncoding;
        buffer = bufferOrString;
      }
      if (offset == null) {
        offset = 0;
      }
      if (length == null) {
        length = buffer.length;
      }
      return this._write(fd, buffer, offset, length, position);
    };this.

    writeFileSync = (
    filePath,
    data,
    options) =>






    {
      let encoding, mode, flag;
      if (typeof options === 'string') {
        encoding = options;
      } else if (options != null) {
        encoding = options.encoding;mode = options.mode;flag = options.flag;
      }
      if (encoding == null) {
        encoding = 'utf8';
      }
      if (typeof data === 'string') {
        data = Buffer.from(data, encoding);
      }
      const fd = this._open(pathStr(filePath), flag || 'w', mode);
      try {
        this._write(fd, data, 0, data.length);
      } finally {
        this.closeSync(fd);
      }
    };this.

    mkdirSync = (dirPath, mode) => {
      if (mode == null) {
        mode = 0o777;
      }
      dirPath = pathStr(dirPath);var _resolve2 =
      this._resolve(dirPath);const dirNode = _resolve2.dirNode,node = _resolve2.node,basename = _resolve2.basename;
      if (node != null) {
        throw makeError('EEXIST', dirPath, 'directory or file already exists');
      }
      dirNode.entries.set(basename, this._makeDir());
    };this.

    symlinkSync = (
    target,
    filePath,
    type) =>
    {
      if (type == null) {
        type = 'file';
      }
      if (type !== 'file') {
        throw new Error('symlink type not supported');
      }
      filePath = pathStr(filePath);var _resolve3 =
      this._resolve(filePath);const dirNode = _resolve3.dirNode,node = _resolve3.node,basename = _resolve3.basename;
      if (node != null) {
        throw makeError('EEXIST', filePath, 'directory or file already exists');
      }
      dirNode.entries.set(basename, {
        type: 'symbolicLink',
        id: this._getId(),
        target: pathStr(target) });

    };this.

    existsSync = filePath => {
      try {var _resolve4 =
        this._resolve(pathStr(filePath));const node = _resolve4.node;
        return node != null;
      } catch (error) {
        if (error.code === 'ENOENT') {
          return false;
        }
        throw error;
      }
    };this.

    statSync = filePath => {
      filePath = pathStr(filePath);var _resolve5 =
      this._resolve(filePath);const node = _resolve5.node;
      if (node == null) {
        throw makeError('ENOENT', filePath, 'no such file or directory');
      }
      return new Stats(node);
    };this.

    createReadStream = (
    filePath,
    options) =>











    {
      let autoClose, encoding, fd, flags, mode, start, end, highWaterMark;
      if (typeof options === 'string') {
        encoding = options;
      } else if (options != null) {
        autoClose = options.autoClose;encoding = options.encoding;fd = options.fd;flags = options.flags;mode = options.mode;start = options.start;
        end = options.end;highWaterMark = options.highWaterMark;
      }
      let st = null;
      if (fd == null) {
        fd = this._open(pathStr(filePath), flags || 'r', mode);
        process.nextTick(() => st.emit('open', fd));
      }
      const ffd = fd;const
      readSync = this.readSync;
      const ropt = { filePath, encoding, fd, highWaterMark, start, end, readSync };
      const rst = new ReadFileSteam(ropt);
      st = rst;
      if (autoClose !== false) {
        const doClose = () => {
          this.closeSync(ffd);
          rst.emit('close');
        };
        rst.on('end', doClose);
        rst.on('error', doClose);
      }
      return rst;
    };this.

    createWriteStream = (
    filePath,
    options) =>









    {
      let autoClose, fd, flags, mode, start;
      if (typeof options !== 'string' && options != null) {
        autoClose = options.autoClose;fd = options.fd;flags = options.flags;mode = options.mode;start = options.start;
      }
      let st = null;
      if (fd == null) {
        fd = this._open(pathStr(filePath), flags || 'w', mode);
        process.nextTick(() => st.emit('open', fd));
      }
      const ffd = fd;
      const ropt = { fd, writeSync: this._write.bind(this), filePath, start };
      const rst = new WriteFileStream(ropt);
      st = rst;
      if (autoClose !== false) {
        const doClose = () => {
          this.closeSync(ffd);
          rst.emit('close');
        };
        rst.on('finish', doClose);
        rst.on('error', doClose);
      }
      return st;
    };this.reset();ASYNC_FUNC_NAMES.forEach(funcName => {const func = this[`${funcName}Sync`];this[funcName] = function () {for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {args[_key] = arguments[_key];}const callback = args.pop();process.nextTick(() => {let retval;try {retval = func.apply(null, args);} catch (error) {callback(error);return;}callback(null, retval);});};});}reset() {this._nextId = 1;this._root = this._makeDir();this._fds = new Map();}

  _makeDir() {
    return { type: 'directory', id: this._getId(), entries: new Map() };
  }

  _getId() {
    return ++this._nextId;
  }

  _open(filePath, flags, mode) {
    if (mode == null) {
      mode = 0o666;
    }
    const spec = FLAGS_SPECS[flags];
    if (spec == null) {
      throw new Error(`flags not supported: \`${flags}\``);
    }var _spec$writable =
    spec.writable;const writable = _spec$writable === undefined ? false : _spec$writable;var _spec$readable = spec.readable;const readable = _spec$readable === undefined ? false : _spec$readable;const
    exclusive = spec.exclusive,mustExist = spec.mustExist,truncate = spec.truncate;var _resolve6 =
    this._resolve(filePath);let dirNode = _resolve6.dirNode,node = _resolve6.node,basename = _resolve6.basename;
    if (node == null) {
      if (mustExist) {
        throw makeError('ENOENT', filePath, 'no such file or directory');
      }
      node = { type: 'file', id: this._getId(), content: new Buffer(0) };
      dirNode.entries.set(basename, node);
    } else {
      if (exclusive) {
        throw makeError('EEXIST', filePath, 'directory or file already exists');
      }
      if (node.type !== 'file') {
        throw makeError('EISDIR', filePath, 'cannot read/write to a directory');
      }
      if (truncate) {
        node.content = new Buffer(0);
      }
    }
    return this._getFd(filePath, { node, position: 0, writable, readable });
  }

  /**
         * Implemented according with
         * http://man7.org/linux/man-pages/man7/path_resolution.7.html
         */
  _resolve(originalFilePath) {
    let filePath = originalFilePath;
    let drive = '';
    if (path === path.win32 && filePath.match(/^[a-zA-Z]:\\/)) {
      drive = filePath.substring(0, 2);
      filePath = filePath.substring(2);
    }
    if (filePath === '') {
      throw makeError('ENOENT', originalFilePath, 'no such file or directory');
    }
    if (filePath[0] === '/') {
      filePath = filePath.substring(1);
    } else {
      filePath = path.join(process.cwd().substring(1), filePath);
    }
    const entNames = filePath.split(path.sep);
    checkPathLength(entNames, originalFilePath);
    const context = {
      node: this._root,
      nodePath: [['', this._root]],
      entNames,
      symlinkCount: 0 };

    while (context.entNames.length > 0) {
      const entName = context.entNames.shift();
      this._resolveEnt(context, originalFilePath, entName);
    }const
    nodePath = context.nodePath;
    return {
      realpath: drive + nodePath.map(x => x[0]).join(path.sep),
      dirNode: nodePath[nodePath.length - 2][1],
      node: context.node,
      basename: nodePath[nodePath.length - 1][0] };

  }

  _resolveEnt(context, filePath, entName) {const
    node = context.node;
    if (node == null) {
      throw makeError('ENOENT', filePath, 'no such file or directory');
    }
    if (node.type !== 'directory') {
      throw makeError('ENOTDIR', filePath, 'not a directory');
    }const
    entries = node.entries;
    if (entName === '' || entName === '.') {
      return;
    }
    if (entName === '..') {const
      nodePath = context.nodePath;
      if (nodePath.length > 1) {
        nodePath.pop();
        context.node = nodePath[nodePath.length - 1][1];
      }
      return;
    }
    const childNode = entries.get(entName);
    if (childNode == null || childNode.type !== 'symbolicLink') {
      context.node = childNode;
      context.nodePath.push([entName, childNode]);
      return;
    }
    if (context.symlinkCount >= 10) {
      throw makeError('ELOOP', filePath, 'too many levels of symbolic links');
    }let
    target = childNode.target;
    if (target[0] === '/') {
      target = target.substring(1);
      context.node = this._root;
      context.nodePath = [['', context.node]];
    }
    context.entNames = target.split(path.sep).concat(context.entNames);
    checkPathLength(context.entNames, filePath);
    ++context.symlinkCount;
  }

  _write(
  fd,
  buffer,
  offset,
  length,
  position)
  {
    const desc = this._fds.get(fd);
    if (desc == null) {
      throw makeError('EBADF', null, 'file descriptor is not open');
    }
    if (!desc.writable) {
      throw makeError('EBADF', null, 'file descriptor cannot be written to');
    }
    if (position == null) {
      position = desc.position;
    }const
    node = desc.node;
    if (node.content.length < position + length) {
      const newBuffer = new Buffer(position + length);
      node.content.copy(newBuffer, 0, 0, node.content.length);
      node.content = newBuffer;
    }
    buffer.copy(node.content, position, offset, offset + length);
    desc.position = position + length;
    return buffer.length;
  }

  _getFd(filePath, desc) {
    let fd = 3;
    while (this._fds.has(fd)) {
      ++fd;
    }
    if (fd >= 256) {
      throw makeError('EMFILE', filePath, 'too many open files');
    }
    this._fds.set(fd, desc);
    return fd;
  }}


class Stats {




















  /**
                                    * Don't keep a reference to the node as it may get mutated over time.
                                    */
  constructor(node) {
    this._type = node.type;
    this.dev = 1;
    this.mode = 0;
    this.nlink = 1;
    this.uid = 100;
    this.gid = 100;
    this.rdev = 0;
    this.blksize = 1024;
    this.ino = node.id;
    this.size =
    node.type === 'file' ?
    node.content.length :
    node.type === 'symbolicLink' ? node.target.length : 0;
    this.blocks = Math.ceil(this.size / 512);
    this.atimeMs = 1;
    this.mtimeMs = 1;
    this.ctimeMs = 1;
    this.birthtimeMs = 1;
    this.atime = new Date(this.atimeMs);
    this.mtime = new Date(this.mtimeMs);
    this.ctime = new Date(this.ctimeMs);
    this.birthtime = new Date(this.birthtimeMs);
  }

  isFile() {
    return this._type === 'file';
  }
  isDirectory() {
    return this._type === 'directory';
  }
  isBlockDevice() {
    return false;
  }
  isCharacterDevice() {
    return false;
  }
  isSymbolicLink() {
    return this._type === 'symbolicLink';
  }
  isFIFO() {
    return false;
  }
  isSocket() {
    return false;
  }}










class ReadFileSteam extends stream.Readable {







  constructor(options)







  {const
    highWaterMark = options.highWaterMark,fd = options.fd;
    // eslint-disable-next-line lint/flow-no-fixme
    // $FlowFixMe: Readable does accept null of undefined for that value.
    super({ highWaterMark });
    this.bytesRead = 0;
    this.path = options.filePath;
    this._readSync = options.readSync;
    this._fd = fd;
    this._buffer = new Buffer(1024);const
    start = options.start,end = options.end;
    if (start != null) {
      this._readSync(fd, new Buffer(0), 0, 0, start);
    }
    if (end != null) {
      this._positions = { current: start || 0, last: end + 1 };
    }
  }

  _read(size) {
    let bytesRead;const
    _buffer = this._buffer;
    do {
      const length = this._getLengthToRead();
      const position = this._positions && this._positions.current;
      bytesRead = this._readSync(this._fd, _buffer, 0, length, position);
      if (this._positions != null) {
        this._positions.current += bytesRead;
      }
      this.bytesRead += bytesRead;
    } while (this.push(bytesRead > 0 ? _buffer.slice(0, bytesRead) : null));
  }

  _getLengthToRead() {const
    _positions = this._positions,_buffer = this._buffer;
    if (_positions == null) {
      return _buffer.length;
    }
    const leftToRead = Math.max(0, _positions.last - _positions.current);
    return Math.min(_buffer.length, leftToRead);
  }}










class WriteFileStream extends stream.Writable {





  constructor(opts)




  {
    super();
    this.path = opts.filePath;
    this.bytesWritten = 0;
    this._fd = opts.fd;
    this._writeSync = opts.writeSync;
    if (opts.start != null) {
      this._writeSync(opts.fd, new Buffer(0), 0, 0, opts.start);
    }
  }

  _write(buffer, encoding, callback) {
    try {
      const bytesWritten = this._writeSync(this._fd, buffer, 0, buffer.length);
      this.bytesWritten += bytesWritten;
    } catch (error) {
      callback(error);
      return;
    }
    callback();
  }}


function checkPathLength(entNames, filePath) {
  if (entNames.length > 32) {
    throw makeError(
    'ENAMETOOLONG',
    filePath,
    'file path too long (or one of the intermediate ' +
    'symbolic link resolutions)');

  }
}

function pathStr(filePath) {
  if (typeof filePath === 'string') {
    return filePath;
  }
  return filePath.toString('utf8');
}

function makeError(code, filePath, message) {
  const err = new Error(
  filePath != null ?
  `${code}: \`${filePath}\`: ${message}` :
  `${code}: ${message}`);

  err.code = code;
  err.errno = constants[code];
  err.path = filePath;
  return err;
}

module.exports = MemoryFs;