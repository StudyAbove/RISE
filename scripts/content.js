//This is the sample estimate reading time from Chrome
funciton renderReadingTime(article) {

    //If no article, no render
    if (!articel) {
        return;
    }

    const text = article.textContent;
    const wordMatchRegExp = /[^\s]+\g;  //Regular_expression
    const words = text.matchAll(wordMatchRegExp);

    //Match all returns an iterator. Convert to array to get word count
    const wordCount = [...words].length;
    const readingTime = Math.round(wordCount / 200);
    const badge = document.createElement("p");
    //Use the same styling as the publish info in an article's header
    badge.classList.add("color-secondary-text", "type--caption");
    badge.textContent = '${readingTime} min read';

    //Suport for API reference docs
    const heading = artcle.querySelector("h1");
    //Support for article docs with date
    const date = article.querySelector("time")?.parentNode;

    (date ?? heading).insertAdjacentElement("afterend", badge);
}

renderReadingTime(document.querySelector("article"));