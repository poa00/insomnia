import { expect } from '@playwright/test';

import { loadFixture } from '../../playwright/paths';
import { test } from '../../playwright/test';;

test.describe('pre-request UI tests', async () => {
    test.slow(process.platform === 'darwin' || process.platform === 'win32', 'Slow app start on these platforms');

    test.beforeEach(async ({ app, page }) => {
        const text = await loadFixture('smoke-test-collection.yaml');
        await app.evaluate(async ({ clipboard }, text) => clipboard.writeText(text), text);

        await page.getByRole('button', { name: 'Create in project' }).click();
        await page.getByRole('menuitemradio', { name: 'Import' }).click();
        await page.locator('[data-test-id="import-from-clipboard"]').click();
        await page.getByRole('button', { name: 'Scan' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();

        await page.getByText('CollectionSmoke testsjust now').click();

        // Set filter responses by environment
        await page.locator('[data-testid="settings-button"]').click();
        await page.locator('text=Insomnia Preferences').first().click();
        await page.getByRole('tab', { name: 'Experiments' }).click();
        await page.getByText('Pre-request Script', { exact: true }).click();
        await page.locator('.app').press('Escape');
    });

    const testCases = [
        {
            name: 'send collectionVariables-populated request',
            preReqScript: `
                insomnia.collectionVariables.set('baseFromScript', 'baseFromScriptValue');
            `,
            body: `{
                "base": "{{ _.baseFromScript }}"
            }`,
            expectedBody: {
                base: 'baseFromScriptValue',
            },
        },
        {
            name: 'send environment-populated request',
            preReqScript: `
                insomnia.collectionVariables.set('fromBase', 'base');
                insomnia.environment.set('fromEnv1', 'env1');
            `,
            body: `{
                "fromBase": "{{ _.fromBase }}",
                "fromEnv1": "{{ _.fromEnv1 }}"
            }`,
            expectedBody: {
                fromBase: 'base',
                fromEnv1: 'env1',
            },
        },
        {
            name: 'send environment-overridden request',
            preReqScript: `
                // 'predefined' is already defined in the base environment, its original value is 'base'
                insomnia.environment.set('predefined', 'updatedByScript');
            `,
            body: `{
                "predefined": "{{ _.predefined }}"
            }`,
            expectedBody: {
                predefined: 'updatedByScript',
            },
        },
        {
            name: 'sendRequest API',
            preReqScript: `
                const resp = await new Promise((resolve, reject) => {
                    insomnia.sendRequest(
                        'http://127.0.0.1:4010/echo',
                        (err, resp) => {
                            if (err != null) {
                                reject(err);
                            } else {
                                resolve(resp);
                            }
                        }
                    );
                });
                insomnia.environment.set('method', resp.method);
                insomnia.environment.set('body', resp.body);
                // insomnia.environment.set('stream', resp.stream);
                insomnia.environment.set('cookies', resp.cookies.filter(_ => true, {}));
                insomnia.environment.set('headers', resp.headers.filter(_ => true, {}));
                insomnia.environment.set('responseTime', resp.responseTime);
                insomnia.environment.set('disabled', resp.disabled);
                insomnia.environment.set('status', resp.status);
            `,
            body: `{
                "content": "sent bt Insomnia.sendRequest"
            }`,
            expectedResponse: {
                method: 'GET',
                headers: {
                    host: '127.0.0.1:4010',
                    'user-agent': 'insomnia/8.5.1',
                    'content-type': 'application/json',
                    'accept': '*/*',
                    'content-length': '61',
                },
                data: {
                    content: 'sent bt Insomnia.sendRequest',
                },
                cookies: {},
            },
        },
        {
            name: 'require url module',
            preReqScript: `
                const URL = require('url');
                const url = new URL('https://user:pwd@insomnia.com:6666/p1?q1=a&q2=b#hashcontent');
                insomnia.environment.set('hash', "#hashcontent");
                insomnia.environment.set('host', "insomnia.com:6666");
                insomnia.environment.set('hostname', "insomnia.com");
                insomnia.environment.set('href', "https://user:pwd@insomnia.com:6666/p1?q1=a&q2=b#hashcontent");
                insomnia.environment.set('origin', "https://insomnia.com:6666");
                insomnia.environment.set('password', "pwd");
                insomnia.environment.set('pathname', "/p1");
                insomnia.environment.set('port', "6666");
                insomnia.environment.set('protocol', "https:");
                insomnia.environment.set('search', "?q1=a&q2=b");
                insomnia.environment.set('username', "user");
                insomnia.environment.set('seachParam', url.searchParams.toString());
            `,
            body: `{
                "hash": "{{ _.hash }}",
                "host": "{{ _.host }}",
                "hostname": "{{ _.hostname }}",
                "href": "{{ _.href }}",
                "origin": "{{ _.origin }}",
                "password": "{{ _.password }}",
                "pathname": "{{ _.pathname }}",
                "port": "{{ _.port }}",
                "protocol": "{{ _.protocol }}",
                "search": "{{ _.search }}",
                "username": "{{ _.username }}",
                "seachParam": "{{ _.seachParam }}"
            }`,
            expectedResponse: {
                method: 'GET',
                headers: {
                    host: '127.0.0.1:4010',
                    'user-agent': 'insomnia/8.5.1',
                    'content-type': 'application/json',
                    'accept': '*/*',
                    'content-length': '532',
                },
                data: {
                    hash: '#hashcontent',
                    host: 'insomnia.com:6666',
                    hostname: 'insomnia.com',
                    href: 'https://user:pwd@insomnia.com:6666/p1?q1=a&q2=b#hashcontent',
                    origin: 'https://insomnia.com:6666',
                    password: 'pwd',
                    pathname: '/p1',
                    port: '6666',
                    protocol: 'https:',
                    search: '?q1=a&q2=b',
                    username: 'user',
                    seachParam: 'q1=a&q2=b',
                },
                cookies: {},
            },
        },
        {
            name: 'require uuid module',
            preReqScript: `
                const uuid = require('uuid');
                insomnia.environment.set('uuid', uuid.NIL);
            `,
            body: `{
                    "uuid": "{{ _.uuid}}"
            }`,
            expectedResponse: {
                method: 'GET',
                headers: {
                    host: '127.0.0.1:4010',
                    'user-agent': 'insomnia/8.5.1',
                    'content-type': 'application/json',
                    'accept': '*/*',
                    'content-length': '70',
                },
                data: {
                    uuid: '00000000-0000-0000-0000-000000000000',
                },
                cookies: {},
            },
        },
        {
            name: 'require collection url object ',
            preReqScript: `
                const insoCollection = require('insomnia-collection');
                const Url = require('postman-collection').Url;
                const { QueryParam, Variable } = require('postman-collection');
                const url = new Url({
                    auth: {
                        username: 'usernameValue',
                        password: 'passwordValue',
                    },
                    hash: 'hashValue',
                    host: ['hostValue', 'com'],
                    path: ['pathLevel1', 'pathLevel2'],
                    port: '777',
                    protocol: 'https:',
                    query: [
                        new QueryParam({ key: 'key1', value: 'value1' }),
                        new QueryParam({ key: 'key2', value: 'value2' }),
                    ],
                    variables: [
                        new Variable({ key: 'varKey', value: 'varValue' }),
                    ],
                });
                insomnia.environment.set('url', url.toString());
            `,
            body: `{
                "url": "{{ _.url }}"
            }`,
            expectedBody: {
                url: 'https://usernameValue:passwordValue@hostvalue.com:777/pathLevel1/pathLevel2?key1=value1&key2=value2#hashValue',
            },
        },
    ];

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];

        test(tc.name, async ({ page }) => {
            const statusTag = page.locator('[data-testid="response-status-tag"]:visible');
            const responseBody = page.getByTestId('response-pane').getByTestId('CodeEditor').locator('.CodeMirror-line');
            // const responseBody = page.getByTestId('response-pane').locator('[data-testid="CodeEditor"]:visible', {
            //     has: page.locator('.CodeMirror-activeline'),
            // });

            await page.getByLabel('Request Collection').getByTestId('echo pre-request script result').press('Enter');

            // set request body
            await page.getByRole('button', { name: 'Body' }).click();
            await page.getByRole('menuitem', { name: 'JSON' }).click();

            const bodyEditor = page.getByTestId('CodeEditor').getByRole('textbox');
            await bodyEditor.fill(tc.body);

            // enter script
            const preRequestScriptTab = page.getByRole('tab', { name: 'Pre-request Script' });
            await preRequestScriptTab.click();
            const preRequestScriptEditor = page.getByTestId('CodeEditor').getByRole('textbox');
            await preRequestScriptEditor.fill(tc.preReqScript);

            // TODO: wait for body and pre-request script are persisted to the disk
            await page.waitForTimeout(500);

            // send
            await page.getByTestId('request-pane').getByRole('button', { name: 'Send' }).click();

            // verify
            await page.waitForSelector('[data-testid="response-status-tag"]:visible');

            await expect(statusTag).toContainText('200 OK');

            const rows = await responseBody.allInnerTexts();
            expect(rows.length).toBeGreaterThan(0);

            const bodyJson = JSON.parse(rows.join('\n'));

            if (tc.expectedBody) {
                expect(bodyJson.data).toEqual(tc.expectedBody);
            }
            if (tc.expectedResponse) {
                expect(bodyJson).toEqual(tc.expectedResponse);
            }
        });
    }
});