import { RESPONSE_CODE_REASONS } from '../../../common/constants';
import { AuthOptions, RequestAuth } from './auth';
import { Property, PropertyBase, PropertyList } from './base';
import { CertificateOptions } from './certificates';
import { Certificate } from './certificates';
import { Cookie, CookieList, CookieOptions } from './cookies';
import { HeaderOptions } from './headers';
import { Header, HeaderList } from './headers';
import { ProxyConfig, ProxyConfigOptions } from './proxy-configs';
import { QueryParam, Url } from './urls';
import { Variable, VariableList } from './variables';

// export type RequestBodyMode =
// file	string
// formdata	string
// graphql	string
// raw	string
// urlencoded	string

export type RequestBodyMode = undefined | 'formdata' | 'urlencoded' | 'raw' | 'file' | 'graphql';

export interface RequestBodyOptions {
    mode: RequestBodyMode;
    file?: string;
    formdata?: { key: string; value: string }[];
    graphql?: object;
    raw?: string;
    urlencoded?: { key: string; value: string }[];
}

export interface ResponseContentInfo {
    mimeType: string;
    mimeFormat: string;
    charset: string;
    fileExtension: string;
    fileName: string;
    contentType: string;
}

export class FormParam extends Property {
    key: string;
    value: string;

    constructor(options: { key: string; value: string }) {
        super();
        this.key = options.key;
        this.value = options.value;
    }

    // TODO
    // (static) _postman_propertyAllowsMultipleValues :Boolean
    // (static) _postman_propertyIndexKey :String

    // not implemented either
    // static parse(_: FormParam) {
    //     throw Error('unimplemented yet');
    // }

    toJSON() {
        return { key: this.key, value: this.value };
    }

    toString() {
        return `${this.key}=${this.value}`; // validate key, value contains '='
    }

    valueOf() {
        return this.value;
    }
}

export class RequestBody extends PropertyBase {
    mode: RequestBodyMode; // type of request data
    file?: string;  // It can be a file path (when used with Node.js) or a unique ID (when used with the browser).
    formdata?: PropertyList<FormParam>;
    graphql?: object; // raw graphql data
    options?: object; // request body options
    raw?: string; // raw body
    urlencoded?: PropertyList<QueryParam>; // URL encoded body params

    constructor(opts: RequestBodyOptions) {
        super({ description: '' });

        this.file = opts.file;
        this.formdata = opts.formdata ?
            new PropertyList(
                opts.formdata.
                    map(formParamObj => new FormParam({ key: formParamObj.key, value: formParamObj.value }))
            ) :
            undefined;
        this.graphql = opts.graphql;
        this.mode = opts.mode;
        // this.options = opts.options;
        this.raw = opts.raw;

        if (typeof opts.urlencoded === 'string') {
            const queryParamObj = QueryParam.parse(opts.urlencoded);
            this.urlencoded = opts.urlencoded ?
                new PropertyList(
                    Object.entries(queryParamObj)
                        .map(entry => ({ key: entry[0], value: JSON.stringify(entry[1]) }))
                        .map(kv => new QueryParam(kv)),
                ) :
                undefined;
        } else {
            // TODO: validate key, value in each entry
            this.urlencoded = opts.urlencoded ?
                new PropertyList(
                    opts.urlencoded
                        .map(entry => ({ key: entry.key, value: entry.value }))
                        .map(kv => new QueryParam(kv)),
                ) :
                undefined;
        }
    }

    isEmpty() {
        switch (this.mode) {
            case 'formdata':
                return this.formdata == null;
            case 'urlencoded':
                return this.urlencoded == null;
            case 'raw':
                return this.raw == null;
            case 'file':
                return this.file == null;
            case 'graphql':
                return this.graphql == null;
            default:
                throw Error(`mode (${this.mode}) is unexpected`);
        }
    }

    toString() {
        try {
            switch (this.mode) {
                case 'formdata':
                    return this.formdata ? this.formdata?.toString() : '';
                case 'urlencoded':
                    return this.urlencoded ? this.urlencoded.toString() : '';
                case 'raw':
                    return this.raw ? this.raw.toString() : '';
                case 'file':
                    return this.file || ''; // TODO: check file id or file content
                case 'graphql':
                    return this.graphql ? JSON.stringify(this.graphql) : '';
                default:
                    throw Error(`mode (${this.mode}) is unexpected`);
            }
        } catch (e) {
            return '';
        }
    }

    update(opts: RequestBodyOptions) {
        this.file = opts.file;
        this.formdata = opts.formdata ?
            new PropertyList(
                opts.formdata.
                    map(formParamObj => new FormParam({ key: formParamObj.key, value: formParamObj.value }))
            ) :
            undefined;
        this.graphql = opts.graphql;
        this.mode = opts.mode;
        // this.options = opts.options;
        this.raw = opts.raw;

        if (typeof opts.urlencoded === 'string') {
            const queryParamObj = QueryParam.parse(opts.urlencoded);
            this.urlencoded = opts.urlencoded ?
                new PropertyList(
                    Object.entries(queryParamObj)
                        .map(entry => ({ key: entry[0], value: JSON.stringify(entry[1]) }))
                        .map(kv => new QueryParam(kv)),
                ) :
                undefined;
        } else {
            // TODO: validate key, value in each entry
            this.urlencoded = opts.urlencoded ?
                new PropertyList(
                    opts.urlencoded
                        .map(entry => ({ key: entry.key, value: JSON.stringify(entry.value) }))
                        .map(kv => new QueryParam(kv)),
                ) :
                undefined;
        }
    }
}

export interface RequestOptions {
    url: string | Url;
    method?: string;
    header?: HeaderOptions[] | object;
    body?: RequestBodyOptions;
    auth?: AuthOptions;
    proxy?: ProxyConfigOptions;
    certificate?: CertificateOptions;
}

export interface RequestSize {
    body: number;
    header: number;
    total: number;
    source: string;
}

export class Request extends Property {
    _kind: string = 'Request';

    url: Url;
    method: string;
    headers: HeaderList<Header>;
    body?: RequestBody;
    auth: RequestAuth;
    proxy?: ProxyConfig;
    certificate?: Certificate;

    constructor(options: RequestOptions) {
        super();

        if (typeof options.url === 'string') {
            if (options.url.indexOf('://') >= 0) {
                this.url = new Url(options.url);
            } else {
                this.url = new Url('https://' + options.url);
            }
        } else {
            this.url = options.url;
        }

        this.method = options.method || 'GET';
        if (options.header) {
            if (Array.isArray(options.header)) {
                this.headers = new HeaderList(
                    undefined,
                    options.header ? options.header.map(header => new Header(header)) : [],
                );
            } else {
                this.headers = new HeaderList(
                    undefined,
                    Object.entries(options.header)
                        .map(entry => new Header({ key: entry[0], value: entry[1] })),
                );
            }
        } else {
            this.headers = new HeaderList(undefined, new Array<Header>());
        }

        this.body = options.body ? new RequestBody(options.body) : undefined;
        this.auth = new RequestAuth(options.auth || { type: 'noauth' });
        this.proxy = options.proxy ? new ProxyConfig(options.proxy) : undefined;
        this.certificate = options.certificate ? new Certificate(options.certificate) : undefined;
    }

    static isRequest(obj: object) {
        return '_kind' in obj && obj._kind === 'Request';
    }

    addHeader(header: Header | object) {
        if (Header.isHeader(header)) {
            const headerInstance = header as Header;
            this.headers.add(headerInstance);
        } else if ('key' in header && 'value' in header) {
            const headerInstance = new Header(header);
            this.headers.add(headerInstance);
        } else {
            throw Error('header must be Header | object');
        }
    }

    addQueryParams(params: QueryParam[] | string) {
        this.url.addQueryParams(params);
    }

    authorizeUsing(authType: string | AuthOptions, options?: VariableList<Variable>) {
        const selectedAuth = typeof authType === 'string' ? authType : authType.type;
        this.auth.use(selectedAuth, options || { type: 'noauth' });
    }

    clone() {
        return new Request({
            url: this.url,
            method: this.method,
            header: this.headers.map(header => header.toJSON(), {}),
            body: {
                mode: this.body?.mode,
                file: this.body?.file,
                formdata: this.body?.formdata?.map(formParam => formParam.toJSON(), {}),
                graphql: this.body?.graphql,
                raw: this.body?.raw,
                urlencoded: this.body?.urlencoded?.map(queryParam => queryParam.toJSON(), {}),
            },
            auth: this.auth.toJSON(),
            proxy: this.proxy ? {
                match: this.proxy.match,
                host: this.proxy.host,
                port: this.proxy.port,
                tunnel: this.proxy.tunnel,
                disabled: this.proxy.disabled,
                authenticate: this.proxy.authenticate,
                username: this.proxy.username,
                password: this.proxy.password,
            } : undefined,
            certificate: {
                name: this.certificate?.name,
                matches: this.certificate?.matches?.map(match => match.toString(), {}),
                key: this.certificate?.key,
                cert: this.certificate?.cert,
                passphrase: this.certificate?.passphrase,
                pfx: this.certificate?.pfx,
            },
        });
    }

    forEachHeader(callback: (header: Header, context?: object) => void) {
        this.headers.each(callback, {});
    }

    getHeaders(options?: {
        ignoreCase: boolean;
        enabled: boolean;
        multiValue: boolean;
        sanitizeKeys: boolean;
    }) {
        // merge headers with same key into an array
        const headerMap = new Map<string, string[]>();
        this.headers.each(header => {
            const enabled = options?.enabled ? !header.disabled : true;
            const sanitized = options?.sanitizeKeys ? !!header.value : true;
            const hasName = !!header.key;

            if (!enabled || !sanitized || !hasName) {
                return;
            }

            header.key = options?.ignoreCase ? header.key?.toLocaleLowerCase() : header.key;

            if (headerMap.has(header.key)) {
                const existingHeader = headerMap.get(header.key) || [];
                headerMap.set(header.key, [...existingHeader, header.value]);
            } else {
                headerMap.set(header.key, [header.value]);
            }
        }, {});

        const obj: Record<string, string[] | string> = {};
        Array.from(headerMap.entries())
            .forEach(headerEntry => {
                obj[headerEntry[0]] = headerEntry[1];
            });

        return obj;
    }

    removeHeader(toRemove: string | Header, options: { ignoreCase: boolean }) {
        const filteredHeaders = this.headers.filter(
            header => {
                if (!header.key) {
                    return false;
                }

                if (typeof toRemove === 'string') {
                    return options.ignoreCase ?
                        header.key.toLocaleLowerCase() !== toRemove.toLocaleLowerCase() :
                        header.key !== toRemove;
                } else if ('name' in toRemove) {
                    if (!toRemove.key) {
                        return false;
                    }

                    return options.ignoreCase ?
                        header.key.toLocaleLowerCase() !== toRemove.key.toLocaleLowerCase() :
                        header.key !== toRemove.key;
                } else {
                    throw Error('type of the "toRemove" must be: string | Header');
                }
            },
            {},
        );

        this.headers = new HeaderList(undefined, filteredHeaders);
    }

    removeQueryParams(params: string | string[] | QueryParam[]) {
        this.url.removeQueryParams(params);
    }

    // TODO:
    // size() → { Object }

    toJSON() {
        return {
            url: this.url.toString(),
            method: this.method,
            header: this.headers.map(header => header.toJSON(), {}),
            body: {
                mode: this.body?.mode,
                file: this.body?.file,
                formdata: this.body?.formdata?.map(formParam => formParam.toJSON(), {}),
                graphql: this.body?.graphql,
                raw: this.body?.raw,
                urlencoded: this.body?.urlencoded?.map(queryParam => queryParam.toJSON(), {}),
            },
            auth: this.auth.toJSON(),
            proxy: this.proxy ? {
                match: this.proxy.match,
                host: this.proxy.host,
                port: this.proxy.port,
                tunnel: this.proxy.tunnel,
                disabled: this.proxy.disabled,
                authenticate: this.proxy.authenticate,
                username: this.proxy.username,
                password: this.proxy.password,
            } : undefined,
            certificate: {
                name: this.certificate?.name,
                matches: this.certificate?.matches?.map(match => match.toString(), {}),
                key: this.certificate?.key,
                cert: this.certificate?.cert,
                passphrase: this.certificate?.passphrase,
                pfx: this.certificate?.pfx,
            },
        };
    }

    update(options: RequestOptions) {
        this.url = typeof options.url === 'string' ? new Url(options.url) : options.url;
        this.method = options.method || 'GET';
        if (options.header) {
            if (Array.isArray(options.header)) {
                this.headers = new HeaderList(
                    undefined,
                    options.header ? options.header.map(header => new Header(header)) : [],
                );
            } else {
                this.headers = new HeaderList(
                    undefined,
                    Object.entries(options.header)
                        .map(entry => new Header({ key: entry[0], value: entry[1] })),
                );
            }
        } else {
            this.headers = new HeaderList(undefined, new Array<Header>());
        }
        this.body = options.body ? new RequestBody(options.body) : undefined;
        this.auth = new RequestAuth(options.auth || { type: 'noauth' });
        this.proxy = options.proxy ? new ProxyConfig(options.proxy) : undefined;
        this.certificate = options.certificate ? new Certificate(options.certificate) : undefined;
    }

    upsertHeader(header: HeaderOptions) {
        // remove keys with same name
        this.headers = new HeaderList(
            undefined,
            this.headers
                .filter(
                    existingHeader => existingHeader.key !== header.key,
                    {},
                )
        );

        // append new
        this.headers.append(new Header(header));
    }
}

export interface ResponseOptions {
    code: number;
    reason?: string;
    header?: HeaderOptions[];
    cookie?: CookieOptions[];
    body?: string;
    // originally stream's type is ‘Buffer | ArrayBuffer’, but it should work in both browser and node
    stream?: ArrayBuffer;
    responseTime: number;
    status?: string;
}

export class Response extends Property {
    _kind: string = 'Response';

    body: string;
    code: number;
    cookies: CookieList;
    headers: HeaderList<Header>;
    // originalRequest: Request;
    responseTime: number;
    status: string;
    stream?: ArrayBuffer;

    constructor(options: ResponseOptions) {
        super();

        this.body = options.body || '';
        this.code = options.code;
        this.cookies = new CookieList(
            undefined,
            options.cookie?.map(cookie => new Cookie(cookie)) || [],
        );
        this.headers = new HeaderList(
            undefined,
            options.header?.map(headerOpt => new Header(headerOpt)) || [],
        );
        // TODO: how to init request?
        // this.originalRequest = options.originalRequest;
        this.responseTime = options.responseTime;
        this.status = RESPONSE_CODE_REASONS[options.code];
        this.stream = options.stream;
    }

    // TODO: accurate type of response should be given
    static createFromNode(
        response: {
            body: string;
            headers: HeaderOptions[];
            statusCode: number;
            statusMessage: string;
            elapsedTime: number;
        },
        cookies: CookieOptions[],
    ) {
        // TODO: revisit this converting
        const buf = new ArrayBuffer(response.body ? response.body.length * 2 : 0); // 2 bytes for each char
        const bufView = new Uint16Array(buf);
        const strLen = response.body.length;
        for (let i = 0; i < strLen; i++) {
            bufView[i] = response.body.charCodeAt(i);
        }

        return new Response({
            cookie: cookies,
            body: response.body.toString(),
            stream: bufView.buffer,
            header: response.headers,
            code: response.statusCode,
            status: response.statusMessage,
            responseTime: response.elapsedTime,
        });
    }

    static isResponse(obj: object) {
        return '_kind' in obj && obj._kind === 'Response';
    }

    contentInfo(): ResponseContentInfo {
        const contentType = this.headers.get('Content-Type');
        // TODO:
        // const contentDisposition = this.headers.get('Content-Disposition');
        // const mimeInfo = getMimeInfo(contentType, response.stream || response.body);
        // let fileName = getFileNameFromDispositionHeader(contentDisposition);

        // contentType: "application/pdf"
        // mimeType: "embed"
        // mimeFormat: "pdf"
        // charset: "utf8"
        // fileExtension: "pdf"
        // fileName: "response.pdf"

        const mimeInfo = {
            extension: '',
            mimeType: '',
            mimeFormat: '',
            charset: '',
            contentType: '',
        };
        let fileName = '';
        const fileExtension = mimeInfo.extension;

        if (!fileName) {
            fileName = 'response';
            fileName += `.${fileExtension}` || '';
        }

        // contentType = mimeInfo.contentType || contentType;

        return {
            mimeType: mimeInfo.mimeType,
            mimeFormat: mimeInfo.mimeFormat,
            charset: mimeInfo.charset,
            fileExtension: fileExtension,
            fileName: fileName,
            contentType: contentType?.valueOf() || 'text/plain',
        };
    }

    dataURI() {
        const contentInfo = this.contentInfo();
        const bodyInBase64 = this.stream || this.body;
        if (!bodyInBase64) {
            throw Error('dataURI() failed as response body is not defined');
        }

        return `data:${contentInfo.contentType};baseg4, <base64-encoded-body>`;
    }

    private findBOM(content: string) {
        // remove UTF-16 and UTF-32 BOM
        if ((content.charCodeAt(0) === 0xFEFF) || (content.charCodeAt(0) === 0xBBBF)) {
            return 1;
        }

        // big endian UTF-16 BOM
        if ((content.charCodeAt(0) === 0xFE) && (content.charCodeAt(1) === 0xFF)) {
            return 2;
        }

        // little endian UTF-16 BOM
        if ((content.charCodeAt(0) === 0xFF) && (content.charCodeAt(1) === 0xFE)) {
            return 2;
        }

        // UTF-8 BOM
        if ((content.charCodeAt(0) === 0xEF) && (content.charCodeAt(1) === 0xBB) &&
            (content.charCodeAt(2) === 0xBF)) {
            return 3;
        }

        return 0;
    }

    json(
        reviver?: ((this: any, key: string, value: any) => any) | undefined,
        strict?: boolean,
    ) {
        let content = this.text();
        const bomIndex = this.findBOM(this.text());
        if (bomIndex > 0) {
            if (strict) {
                throw Error('byte order mark (BOM) is found while strict=true');
            }
            content = this.text().slice(bomIndex);
        }

        try {
            return JSON.parse(content, reviver);
        } catch (e) {
            throw new Error(`failed to get json of body: ${e.message}`);
        }
    }

    // jsonp(reviver?, strict?) {

    // }

    reason() {
        return this.status;
    }

    // TODO:
    // size(): number {

    // }

    text() {
        return this.body;
    }

    // timings seems not supported yet
}