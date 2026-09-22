const EUROPE_PMC_SEARCH_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

const researchForm = document.querySelector("#research-form");
const questionInput = document.querySelector("#research-question");
const researchButton = document.querySelector(".research-button");
const validationMessage = document.querySelector("#validation-message");
const resultsSection = document.querySelector("#results");
const resultsQuestion = document.querySelector("#results-question");
const resultsCount = document.querySelector("#results-count");
const resultsMessage = document.querySelector("#results-message");
const paperList = document.querySelector("#paper-list");

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function createAbstractPreview(abstract) {
  const plainText = abstract.replace(/<[^>]*>/g, "").trim();
  const maximumLength = 500;

  return plainText.length > maximumLength
    ? `${plainText.slice(0, maximumLength).trimEnd()}...`
    : plainText;
}

function createPaperCard(paper) {
  const title = paper.title || "Untitled paper";
  const authors = paper.authorString || "Authors not available";
  const year = paper.pubYear || paper.firstPublicationDate?.slice(0, 4) || "Year not available";
  const journal = paper.journalTitle || "Journal not available";
  const abstract = paper.abstractText
    ? createAbstractPreview(paper.abstractText)
    : "No abstract is available for this paper.";
  const identifiers = [];

  if (paper.doi) identifiers.push(`<span><strong>DOI:</strong> ${escapeHtml(paper.doi)}</span>`);
  if (paper.pmid) identifiers.push(`<span><strong>PMID:</strong> ${escapeHtml(paper.pmid)}</span>`);
  if (paper.pmcid) identifiers.push(`<span><strong>PMCID:</strong> ${escapeHtml(paper.pmcid)}</span>`);

  const paperUrl = paper.id && paper.source
    ? `https://europepmc.org/article/${encodeURIComponent(paper.source)}/${encodeURIComponent(paper.id)}`
    : "";

  return `
    <article class="paper-card">
      <p class="paper-meta">${escapeHtml(authors)} &middot; ${escapeHtml(year)}</p>
      <h3>${escapeHtml(title)}</h3>
      <p class="paper-meta">${escapeHtml(journal)}</p>
      <p class="abstract">${escapeHtml(abstract)}</p>
      ${identifiers.length ? `<p class="paper-details">${identifiers.join("")}</p>` : ""}
      ${paperUrl ? `<a class="view-paper-button" href="${paperUrl}" target="_blank" rel="noopener noreferrer">View Paper</a>` : ""}
    </article>
  `;
}

function showLoading(question) {
  resultsQuestion.textContent = question;
  resultsCount.textContent = "";
  resultsMessage.textContent = "Searching scientific literature...";
  resultsMessage.classList.remove("error-message");
  paperList.innerHTML = "";
  resultsSection.hidden = false;
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showError(message) {
  resultsCount.textContent = "";
  resultsMessage.textContent = message;
  resultsMessage.classList.add("error-message");
  paperList.innerHTML = "";
}

function renderPapers(papers) {
  resultsCount.textContent = `${papers.length} ${papers.length === 1 ? "paper" : "papers"} found`;
  resultsMessage.textContent = "";
  resultsMessage.classList.remove("error-message");
  paperList.innerHTML = papers.map(createPaperCard).join("");
}

async function searchPapers(question) {
  const searchParameters = new URLSearchParams({
    query: question,
    format: "json",
    pageSize: "10",
    resultType: "core"
  });

  const response = await fetch(`${EUROPE_PMC_SEARCH_URL}?${searchParameters}`);

  if (!response.ok) {
    throw new Error("Europe PMC could not complete the search.");
  }

  const data = await response.json();
  const results = data.resultList?.result || [];
  return Array.isArray(results) ? results : [results];
}

researchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();

  if (!question) {
    validationMessage.textContent = "Please enter a research question to continue.";
    questionInput.focus();
    return;
  }

  validationMessage.textContent = "";
  showLoading(question);
  researchButton.disabled = true;
  researchButton.textContent = "Searching...";

  try {
    const papers = await searchPapers(question);

    if (!papers.length) {
      showError("No papers were found for this question. Try using different search terms.");
      return;
    }

    renderPapers(papers);
  } catch (error) {
    showError("We could not search Europe PMC right now. Please check your connection and try again.");
  } finally {
    researchButton.disabled = false;
    researchButton.textContent = "Research";
  }
});
