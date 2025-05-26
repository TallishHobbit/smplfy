A scholastic project, originally done as part of a multiple-month challenge. 

Available under MIT license, so you can do whatever you want with the code, sell it, whatever, as long as you don't delete credit.

Dependencies: (Yes, I really know this little about JS / web development)
  - RequireJS (scripts/require.js): Library for managing dependencies, used heavily to make up for my inexperience with JavaScript
    - json.js (scripts/lib/require/json.js): Plugin for RequireJS, allows for convenient access to JSON files on the web
    - text.js (sibling of json.js): Plugin for RequireJS, as of yet only used as dependency of json.js
  - jQuery (scripts/lib/jquery-3.7.1.min.js): DOM manipulation and fetching data from URLs, used to remove all spaghetti code from main website logic
  - Lemmatizer (scripts/lib/lemmatizer-v0.0.2.js): Retrieving the root form of words, used as part of the "search-and-find" functionality of the website
    - UnderscoreJS (scripts/lib/lemmatizer-v0.0.2.js): Library of general-use functions, only utilized as dependency of Lemmatizer
                                                       (I was already running out of time, I don't need to learn another library)

File sources:
  - dict folder (scripts/lib/dict/*): All the of these JSON files are included on Takafumi Yamano's GitHub page under a folder of the same name, all being dependencies of Lemmatizer
  - src folder (scripts/src/*): JSON files containing webscraped phrases restructured for use in this program or any relevant info used by the program
    - phrases.json Object Structure:
      - Document takes the form of a list.
        - phrase: A single word, acronym, or phrase commonly used in insurance
        - meaning: A definition of the phrase, occasionally including an example (infrequently enough not to be separated)
        - category: Extra information separated from the phrase by the site the phrases were scraped from (open online resource, TODO: Add site name, url)
          - NOTICE: If "category" appeared in "acronyms", "category" was removed during processing. Most phrases did not contain a category at the time of scraping.
        - acronyms: A list of acronyms (Strings of consecutive capital letters / non-punctuation symbols, for example the ampersand / "&").
          - NOTICE: If an acronym was found that matches "phrase" exactly, that acronym was removed during processing. "acronyms" is not included if none were found.
          - WARNING: At least one phrase object contains fictional acronyms from an example contained in the "meaning" attribute, and may or may not result in false positives.
    - lookup.json Object Structure
      - Document takes the form of a list
        - lemmas: Contains list with the lemmatized version of the phrase, followed by the lemmatized meaning and then category, if applicable
          - NOTICE: If the phrase is an acronym, it still appears first, but remains unchanged (like all other acronyms)
        - acronyms: An array of all acronyms found in the phrase/meaning, now separate.
        - index: The index of the phrase the entry is associated with
        - connections: A list of phrase objects
          - index: The index of the original phrase of the matched lookup entry, from phrases.json
          - phrase: The phrase, acronym or otherwise, unedited and sourced from phrases.json based on "index"

Most of the code is commented, though proper documentation is yet to come.
