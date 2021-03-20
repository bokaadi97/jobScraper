const request = require("request-promise");
const puppeteer = require("puppeteer");
const fs = require("fs");
const cheerio = require("cheerio");

async function main(){
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();
    const url = "https://schonherz.hu/diakmunkak/budapest/fejleszto---tesztelo";
    await page.goto(url);
    await page.setViewport({
        width: 1200,
        height: 800
    });

    await autoScrollToBottom(page);

    const html = await page.content();
    const $ = await cheerio.load(html);

    const result = $("h4 a").map((index, element) => {
        const title = $(element).text();
        const link = "https://schonherz.hu" + $(element).attr("href");
        const description = "";
        return {title, link, description};
    })
    .get(); //ez a cheerio sajátossága, map()-nél kell a végére ez a .get()

    const jsonData = JSON.stringify(result);
    fs.writeFile("unfilteredJobs.txt", jsonData, function(err) {
        if (err) {
            console.log(err);
        }
    });

    await browser.close();
}



async function handleData(){
    let jobs = JSON.parse(fs.readFileSync("unfilteredJobs.txt", 'utf8'));

    for(const job of jobs) {
        const result = await request.get(job.link);
        const $ = cheerio.load(result);
        const jobDescription = $("#ad-details").text().toLowerCase();
        job.description = jobDescription;
    }

    let filteredJobs = returnContains("c++", jobs);
    //filteredJobs = returnContains("1926", filteredJobs);
    filteredJobs = returnNotContains("php", filteredJobs);

    filteredJobs.forEach( job => job.description = "");

    const readyData = JSON.stringify(filteredJobs);
    fs.writeFile("filteredJobs.txt", readyData, function(err) {
        if (err) {
            console.log(err);
        }
    });

}

function returnContains(string, array){
    return array.filter(job => {return job.description.includes(string)});
}

function returnNotContains(string, array){
    return array.filter(job => {return !job.description.includes(string)});
}

//legörget a lazyload-os oldalak aljára
async function autoScrollToBottom(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            let totalHeight = 0;
            let distance = 100;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

main();
handleData();
