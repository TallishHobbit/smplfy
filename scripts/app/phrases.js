/* 
* Copyright (c) 2025 TallishHobbit
* smplfy (JavaScript-based Insurance Phrase Recognizer)
* https://github.com/TallishHobbit/smplfy
* MIT License
*/

import lem from "../lib/lemmatizer-v0.0.2.js";
// TODO: Use fetch API to import JSON files

// define(["lemmatizer", "json!src/phrases.json", "json!src/lookup.json"], 
// function(lem,          phraseData,              lookupData) {

// Initialize the lemmatizer (See licensing in lemmatizer-v0.0.2.js)
const lemmatizer = new lem.Lemmatizer();

// **************************************************
// Internal/Private (Not included in return statement)
// **************************************************

// For my sanity, I have wrapped the ".splice()" method of removing
// a specific element in an Array in a function that doesn't look hacky
Array.prototype.remove = function(index) {
  this.splice(index, 1); // Remove 1 element from the arry, starting at index
}

/*
  * Check if a string is an acronym
  * Explanation:
  *   From the start of the string to the end, ("^" to "$")
  *   check if there are at least 2 ("{2,}")
  *   valid acronym characters ("[A-Z&]")
  */
String.prototype.isAcronym = function() {
  return (/^[A-Z&]{2,}$/).test(this);
}

/**
 * Removes all acronyms from an Array of words
 * @param {Array} arr - A list potentially containing acronyms
 * @return {void} - All changes to arr are automatically applied
 * Didn't need to be an extension, just looks better this way
 */
function removeAcronyms(arr) {
  let length = arr.length;
  let i = 0;
  while (i < length) {
    if (arr[i].isAcronym()) {
      arr.remove(i);
      // Element i has been removed, so the next element also has index i
    } else { // Not an acronym
      i++;
    }
    length = arr.length;
  } // End of loop
} // End of removeAcronyms

/**
 * Searches for all first-degree connections between phrases
 * @param {Array} phrases - A list of lookup objects
 * @return {void} - All changes to the objects are automatically applied
 */
function generateConnections(phrases) {
  const phrase = 0;
  const meaning = 1;
  const category = 2;
  
  for (let i = 0; i < phrases.length; i++) {
    const curr = phrases[i];
    const connections = [];

    for (let j = 0; j < phrases.length; j++) {
      // Don't execute on curr
      if (i === j) {
        continue;
      }
      
      const other = phrases[j];

      // If any are true, a connection would be made. Better than a massive "or".
      if ( (Object.hasOwn(curr, "acronyms") && Object.hasOwn(other, "acronyms"))     // If they have matching
      && ( curr.acronyms.some((acr) => other.acronyms.includes(acr))                 // acronyms, connect them.
      || other.acronyms.includes(curr.lemmas[phrase]) ) ) {                          // Phrase might be there, too
        connections.push({ "index": j });
      } else if ( curr.lemmas[meaning].includes(other.lemmas[phrase])                // Or if either phrase is
      || other.lemmas[meaning].includes(curr.lemmas[phrase]) ) {                     // in the other's meaning
        connections.push({ "index": j });
      } else if ( (curr.lemmas.length > 2 && other.lemmas.length > 2)                // Or if they have
      && (curr.lemmas[category] == other.lemmas[category]) ) {                       // matching categories
        connections.push({ "index": j });
      } // End of "if" brick
    } // end other loop

    if (connections.length > 0) {
      // Add the actual phrase to each of the connections
      for (let k = 0; k < connections.length; k++) {
        const cnctn = connections[k];
        cnctn.phrase = phraseData[cnctn.index].phrase;
      }
      curr.connections = connections;
    }
  } // End curr loop
} // End of generate connections

/**
 * Compares how likely a lookup Object is to appear
 * @param {Object} entry - A lookup object
 * @return {Number} - the calculated relevance
 */
function calcRelevance(entry) {
  // Not a true comparison of relevance, but close enough.
  let relevance = entry.lemmas.length;
  
  if (Object.hasOwn(entry, "acronyms")) {
    relevance += entry.acronyms.length;
  }
  
  if (Object.hasOwn(entry, "connections")) {
    relevance += entry.connections.length;
  }

  return relevance;
}

/**
 * Generates the normalized list of phrase data, printing it to the console to be copied.
 */
function printNormalizedPhraseData() {
  // Start the list
  const lookup = [];

  // Run for all phrases
  for (let i = 0; i < phraseData.length; i++) {
    // Get the current phrase, instantiate object
    const entry = phraseData[i];
    const lookupObj = {};

    // Lemmatize almost all info
    const lemms = [];

    // If the phrase is/contains an acronym, don't normalize the acronym
    lemms.push( nonDestructiveNormalize(entry.phrase) );

    lemms.push( pickyNormalize(entry.meaning) );

    // Only if category exists
    if (Object.hasOwn(entry, "category")) {
      lemms.push( pickyNormalize(entry.category) );
    }

    lookupObj.lemmas = lemms;

    // Add acronyms, if applicable
    if (Object.hasOwn(entry, "acronyms")) {
      lookupObj.acronyms = entry.acronyms;
    }

    lookupObj.index = i;
    
    lookup.push(lookupObj);
  } // End of for

  // This'll take a while, but I don't know enough
  // big O to tell you just how inefficient it is.
  generateConnections(lookup);

  for (let i = 0; i < lookup.length; i++) {
    const curr = lookup[i];
    curr.relevance = calcRelevance(curr);
  }
  
  // Convert every element to JSON text
  const data = lookup.map((datum) => JSON.stringify(datum));
  
  console.log(`[\n  ${data.join(",\n  ")}\n]`); // FUNCTION-RELATED LOG. DO NOT DELETE.
} // End of pNPD

// **************************************************
// Public
// **************************************************

/**
 * Normalizes the given fragment by removing any features that are potentially ever-so-slightly different
 * @param {String} text - A string that may contain some punctuation, which is to be removed
 * @return {String} - The original text, sans acronyms, punctuation, capitalization, and alternate word forms
 */
function pickyNormalize(text) {
  // Remove all punctuation
  text = text.replaceAll(/[\W\S_]+/g, "");
  
  // Make an array of all the words, without surrounding spaces
  const words = text.split(/[\s]+/);
  words.map((each) => each.trim()); // Redundancy is key when you don't know what you are doing
  
  removeAcronyms(words);

  // Remove capitalization for all words
  const capNormalized = words.map((word) => word.toLowerCase()); // Arrow notation for the win!
  
  // Get one lemma for each word (Only ever choosing the first lemma should be fine, right?)
  const normalized = capNormalized.map((word) => lemmatizer.only_lemmas(word)[0]); // ".only_lemmas" returns a list

  // Return the line, a string once more
  return normalized.join(" ").trim();
}

/**
 * Normalizes the given text, saving acronyms and other meaningful word strings
 * @param {String} text - A string that may contain some punctuation, which is to be ignored
 * @return {String} - The original text, sans capitalization, punctuation, and alternate word forms
 */
function nonDestructiveNormalize(text) {
  // Remove all punctuation
  text = text.replaceAll(/[,.()\/']/g, "");
  
  // Make an array of all the words, without surrounding spaces
  const words = text.split(/[\s]+/);
  const trimmed = words.map((each) => each.trim()); // Redundancy is key when you don't know what you are doing

  // Remove capitalization for all words except acronyms
  const capNormalized = trimmed.map((word) => {
    if (word.isAcronym()) {
      return word;
    }
    return word.toLowerCase();
  } );
  
  // Get one lemma for each word (Only ever choosing the first lemma should be fine, right?)
  const normalized = capNormalized.map( (word) => {
    const normWord = lemmatizer.only_lemmas( word )[0]; // ".only_lemmas" returns a list
    
    // Acronyms are always to be left as is, and
    // Lemmatizer tends to delete one letter words,
    // of which there aren't many, but this is cleaner.
    // Shorter words in general aren't treated well,
    // hence the extra check.
    if ( word.isAcronym() || word.length == 1 
    || normWord === undefined || normWord.length == 0 || normWord.valueOf() == " " ) {
      return word;
    }
    // Otherwise, it's business as usual
    return normWord;
  } );

  // Return the line, a string once more
  return normalized.join(" ").trim();
}

/**
 * Fetches a phrase at the given position from lookup
 * @param {int} index - The index of the phrase to be fetched in lookup.json (NOT index attr)
 * @return {Object} - The lookup object at that index
 */
function fetchLookup(index) {
  return lookupData[index];
}

/**
 * Fetches a phrase at the given position from phrases
 * @param {int} index - The index of the phrase to be fetched in phrases.json 
 * @return {Object} - The phrase object at that index
 */
function fetchPhrase(index) {
  return phraseData[index];
}

/**
 * Finds all matching phrases in the database
 * @param {string} text - The text to be parsed for phrases
 * @return {Object} - A list of match objects, set up as follows
 *   lookup: The matched phrase in lookup.json
 *   locations: A list of objects
 *     index: the starting index of the match in text,
 *            split on whitespace. 
 *     span: how many split-on-whitespace-elements the match covers
 */
function findMatches( text ) {
  // Hackiest solution yet. You have been warned.
  // Replace all punctuation with a single random letter, just as long as it
  // won't create false positives. This allows ctrl+A pastes from Hades like
  // https://doi.nv.gov/uploadedFiles/doinvgov/_public-documents/Consumers/AU127-1.pdf
  // to avoid the definitions being offset. Welcome to stress testing.
  text = text.replaceAll(/[,.()\/]/g, "x");

  // Replace all non-contained ' with x, too
  text = text.replaceAll(/([\s](')|(')[\s]){1}/g, "x");

  text = nonDestructiveNormalize( text );
  
  const matches = [];

  for (let i = 0; i < lookupData.length; i++) {
    const currLookup = lookupData[i];

    const locations = [];

    const rawIndices = searchForXInY(currLookup, text);
    // While anything is found
    while ( rawIndices.length > 0 ) {
      // Save the first place something matched at
      let firstThing = rawIndices[0];
      for (let j = 1; j < rawIndices.length; j++) {
        if (rawIndices[j].index < firstThing.index) {
          firstThing = rawIndices[j];
        }
      }

      // console.log( "First thing: " + JSON.stringify(firstThing.thing) );

      // Save the location, relative to splits at spaces
      const span = firstThing.thing.split(/[\s]+/g).length;

      // console.log("    With a span of " + span);

      // Get everything, including the matching thing
      const textUpToThing = text.substring(0, firstThing.index + firstThing.thing.length);
      const splitAtSpaces = textUpToThing.split( /[\s]+/g );
      // Remove empty strings
      for (let j = 0; j < splitAtSpaces.length; ) {
        if ( splitAtSpaces[j].valueOf() == "" ) {
          splitAtSpaces.remove(j);
        } else {
          j++;
        }
      }
      
      
      // If sAS contains the entire text up to / including the match,
      // then the number of words (space-separated non-empty strings)
      // is "span" more than the index of the match.
      let index = splitAtSpaces.length - span;

      // console.log("    At word index " + index);

      locations.push( {
        "index": index,
        "span": span
      } );

      // Clear the list
      rawIndices.splice(0, rawIndices.length);
      // Add the next search
      const nextResults = searchForXInY(currLookup, text, firstThing.index + firstThing.thing.length);
      for (let j = 0; j < nextResults.length; j++) {
        rawIndices.push( nextResults[j] );
      }
    } // End location loop
    
    if ( locations.length > 0 ) {
      matches.push( {
        "lookup": currLookup,
        "locations": locations
      } );
    }
  } // End lookup loop

  console.log( "nDNormalized Text: " + text );

  return matches;
} // End findMatches

/**
 * Finds the "raw" or not-word-based index of things
 * @param {Object} lookup - The lookup you want to check for
 * @param {String} reference - Where you want to search for things
 * @param {int} index - The starting index of the search. Defaults to 0.
 * @return {Array} - A list of indices / what was checked as objects
 */
function searchForXInY( lookup, reference, index) {
  const indices = [];

  // I didn't properly lowercase the phrase or category, so...
  let things = [ lookup.lemmas[0].toLowerCase() ];
  let hasAcronyms = false;
  let hasCategory = false;

  if ( Object.hasOwn(lookup, "acronyms") ) {
    things = things.concat( lookup.acronyms );
    hasAcronyms = true;
  }
  // If it has a category
  if ( lookup.lemmas.length > 2 ) {
    things = things.concat( lookup.lemmas[2].toLowerCase() );
    hasCategory = true;
  }

  for (let i = 0; i < things.length; i++) {
    
    // console.log( "Checking this thing: " + JSON.stringify(things[i]) );

    const iOf = reference.indexOf(things[i], index);
    
    if ( iOf > -1 ) {
      indices.push({
        "index": iOf,
        "thing": things[i]
      });
    }
  } // End things loop

  // console.log("Indices: " + JSON.stringify(indices));
  
  return indices;
}

export default {
  "phrasesLength" : phraseData.length,
  "fetchPhrase"   : fetchPhrase,
  "lookupLength"  : lookupData.length,
  "fetchLookup"   : fetchLookup,
  "nonDestructiveNormalize": nonDestructiveNormalize,
  "pickyNormalize": pickyNormalize,
  // Shhhhh. I didn't want to learn file editing
  // "printNormalizedPhraseData": printNormalizedPhraseData,
  "findMatches"   : findMatches,
};
