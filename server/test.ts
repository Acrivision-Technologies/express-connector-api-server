import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import * as xmlJs from "xml-js";
import * as fs from "fs";

let accessToken = "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IlFBSU1TLkJFTlRMRVkyMiIsInBpLmF0bSI6ImE4bWUifQ.eyJzY29wZSI6WyJvcGVuaWQiLCJlbWFpbCIsInByb2ZpbGUiLCJvcmdhbml6YXRpb24iLCJmZWF0dXJlX3RyYWNraW5nIiwiZ2xvYmFsX3JvbGVzIiwidG93ZXJzaWdodC1wb3J0YWwtaW1tZWRpYXRlLWJhY2tlbmQiLCJ0b3dlcnNpZ2h0LXBvcnRhbC1iZmYiLCJjb250ZXh0LXJlZ2lzdHJ5LXNlcnZpY2UiLCJwcm9kdWN0LXNldHRpbmdzLXNlcnZpY2UiLCJyYmFjLXNlcnZpY2UiLCJwcm9qZWN0d2lzZS1zaGFyZSIsInVsYXMtcmVhbHRpbWUtbG9nLXBvc3RpbmctMjczMyIsImxvZy1kaXNwYXRjaGVyLTI3NjA6d3JpdGUiLCJjbG91ZC1vcmNoZXN0cmF0aW9uLXNlcnZpY2UtMjU2NiIsIm9wZW50b3dlcmlxLWFwaSIsInRvd2Vyc2lnaHQtaXR3aW4tYmFja2VuZCIsImltb2RlbGh1YiIsImltb2RlbC1icmlkZ2Utc2VydmljZS1hcGktZ2VuZXJhbCIsInJlYWxpdHlkYXRhOnJlYWQiLCJyZWFsaXR5ZGF0YTptb2RpZnkiLCJpbnNpZ2h0LWFwaSJdLCJjbGllbnRfaWQiOiJ0b3dlcnNpZ2h0LXBvcnRhbC1zcGEtMzA2MSIsImF1ZCI6WyJodHRwczovL3FhLWltcy5iZW50bGV5LmNvbS9hcy90b2tlbi5vYXV0aDIiLCJodHRwczovL3FhLWltc29pZGMuYmVudGxleS5jb20vYXMvdG9rZW4ub2F1dGgyIiwiaHR0cHM6Ly9xYTItaW1zLmJlbnRsZXkuY29tL2FzL3Rva2VuLm9hdXRoMiIsImh0dHBzOi8vcWEyLWltc29pZGMuYmVudGxleS5jb20vYXMvdG9rZW4ub2F1dGgyIiwiaHR0cHM6Ly9xYS1pbXNvaWRjLmJlbnRsZXkuY29tL3Jlc291cmNlcyIsImh0dHBzOi8vcWEyLWltcy5iZW50bGV5LmNvbS9yZXNvdXJjZXMiLCJ0b3dlcnNpZ2h0LXBvcnRhbC1pbW1lZGlhdGUtYmFja2VuZC0zMDYxIiwidG93ZXJzaWdodC1wb3J0YWwtYmZmLTMwNjEiLCJjb250ZXh0LXJlZ2lzdHJ5LTI3NzciLCJwcm9kdWN0LXNldHRpbmdzLXNlcnZpY2UtMjc1MiIsInJiYWMtMjU2MyIsInByb2plY3R3aXNlLXNoYXJlLTI1NjciLCJ1bGFzLXJlYWx0aW1lLWxvZy1wb3N0aW5nLTI3MzMiLCJsb2ctZGlzcGF0Y2hlci0yNzYwIiwiY2xvdWQtb3JjaGVzdHJhdGlvbi1zZXJ2aWNlLTI1NjYiLCJvcGVudG93ZXJpcS1hcGktMzIyNCIsInRvd2Vyc2lnaHQtaXR3aW4tYmFja2VuZC0zMDYxIiwiaW1vZGVsLWh1Yi1zZXJ2aWNlcy0yNDg1IiwiaW1vZGVsLWJyaWRnZS1zZXJ2aWNlLWFwaSIsImJlbnRsZXktYXBpLW1hbmFnZW1lbnQiLCJpbnNpZ2h0LWFwaS02MjU4Il0sInN1YiI6IjM4ZGJkMmIxLWUyOGQtNDM5OC1hNjI4LWQ3MWE1OWI3M2ZmNyIsInJvbGUiOlsiU0lURV9BRE1JTklTVFJBVE9SIiwiUHJvamVjdFNoYXJlIEZlZGVyYXRlZCBDb25uZWN0aW9ucyAtIFBXREkiLCJCRU5UTEVZX0VNUExPWUVFIiwiRGVzaWduIEluc2lnaHRzIEVhcmx5IEFjY2VzcyIsIkJFTlRMRVlfRU1QTE9ZRUUiXSwib3JnIjoiNzJhZGFkMzAtYzA3Yy00NjVkLWExZmUtMmYyZGZhYzk1MGE0Iiwic3ViamVjdCI6IjM4ZGJkMmIxLWUyOGQtNDM5OC1hNjI4LWQ3MWE1OWI3M2ZmNyIsImlzcyI6Imh0dHBzOi8vcWEtaW1zb2lkYy5iZW50bGV5LmNvbSIsImVudGl0bGVtZW50IjpbIlNFTEVDVF8yMDA2Il0sInByZWZlcnJlZF91c2VybmFtZSI6IlZpbmF5YWsuUGF0aWxAYmVudGxleS5jb20iLCJnaXZlbl9uYW1lIjoiVmluYXlhayIsInNpZCI6ImF2VTNoSW5tZVI5ZnBFU01IMkRZblhPcHAzMC5VVUZKVFZNdFFtVnVkR3hsZVMxVFJ3LmtVUmkub2l4cTRkY3ZQblZqdlFOOWRwdjRSaXMwSyIsIm5iZiI6MTY4NzI1NzU3MiwidWx0aW1hdGVfc2l0ZSI6IjEwMDEzODkxMTciLCJ1c2FnZV9jb3VudHJ5X2lzbyI6IlVTIiwiYXV0aF90aW1lIjoxNjg3MjU3ODcyLCJuYW1lIjoiVmluYXlhay5QYXRpbEBiZW50bGV5LmNvbSIsIm9yZ19uYW1lIjoiQmVudGxleSBTeXN0ZW1zIEluYyIsImZhbWlseV9uYW1lIjoiUGF0aWwiLCJlbWFpbCI6IlZpbmF5YWsuUGF0aWxAYmVudGxleS5jb20iLCJleHAiOjE2ODcyNjE0NzV9.ngGnm_8M9Fu9LzDaFY7pFS0oRdrpHi2TzROg_LyUFIO3XDKg39JcfdAy8bsVVxZ_U9Zkz0E-HlP4oMy7ErGXG34OU5MZvxaQgz68KlHphqtc6SA9ko4HAZrwU0rqguj8_VCA8jjBLOypcO8-leW2HkHqq7YZgfUSgtSWPmRyqlY5nfSpWPE1Y09NP76fUHgWvHJm41fidfDXcELPTs20ca2lRKBsCLbDLteSlM9u-S--faMxqxAUiQxx8N_TmWuorswucXtEpTUpuvAcsR-zzeYtzU3r5J83_F7WGbvdtW_-crNG5uqktQriINyB2wXgKmxe77o81_iBVM2n9w0hjg";

// let url = "https://projectsharedeveussa01.blob.core.windows.net/azuresqldbecpluginstorage/ProjectShare/File/0721bc08-99bb-4fa4-b329-f87ab357163c?sv=2019-07-07&sr=b&sig=L0I7V0CI0fiyaey4P4Xq1n74y0cAuGzFxUL8izOYOJc%3D&se=2023-06-20T11%3A54%3A38Z&sp=rw&rscd=attachment%3B filename%3D\"812356Otxml.otxml\"";
let url = "https://projectsharedeveussa01.blob.core.windows.net/azuresqldbecpluginstorage/ProjectShare/File/0721bc08-99bb-4fa4-b329-f87ab357163c?sv=2019-07-07&sr=b&sig=Wls8UdWW8GbYPzNax4zpoy2NshkgA%2BVCSaqZN8bUA6E%3D&se=2023-06-20T12%3A17%3A07Z&sp=rw&rscd=attachment%3B%20filename%3D%22812356Otxml.otxml%22";

let config: AxiosRequestConfig = {
    headers: {
        // "Authorization": accessToken,
        "Content-Type": "text/xml",
        "Accept": "text/xml"
    }
}

axios.get(url, config)
    .then((res: any) => {
        console.log('res');
        let contentdisposition: any = res.headers['content-disposition'];
        console.log(`contentdisposition: ${contentdisposition}`); 
        const splitArray: any = contentdisposition.split(";");
        const filenameText = (splitArray[splitArray.length - 1]).replace(/"/g, '').replace(/'/g, '');
        console.log(`filenameText: ${filenameText}`);
        const filenameValueArray  = filenameText.split("=");
        console.log(`filenameValueArray: ${filenameValueArray}`);
        const filename = filenameValueArray[filenameValueArray.length - 1];
        console.log(`filename: ${filename}`);


        // fs.writeFile('./test.xml', res.data, { flag: 'wx' }, function (err) {
        //     if (err) throw err;
        //         console.log("It's saved!");
        // });
        console.log("Done");
        // var result1 = xmlJs.xml2json(res.data, {compact: true, spaces: 4});
        // console.log(result1);
        // console.log(JSON.stringify(res));
    })
    .catch((error: any) => {
        console.log('error');
        console.log(JSON.stringify(error));
    })