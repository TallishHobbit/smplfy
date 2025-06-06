/* 
* Copyright (c) 2025 TallishHobbit
* smplfy (JavaScript-based Insurance Phrase Recognizer)
* https://github.com/TallishHobbit/smplfy
* MIT License
*/

// TODO: Move all annotation functionality here.

import phraseData from "../src/phrases.json" with { type: "json" };
import lookupData from "../src/lookup.json" with { type: "json" };

// **************************************************
// Internal/Private (Not included in return statement)
// **************************************************

// For my sanity, I have wrapped the ".splice()" method of removing
// a specific element in an Array in a function that doesn't look hacky
Array.prototype.remove = function(index) {
  this.splice(index, 1); // Remove 1 element from the arry, starting at index
}

/*
  * Check if a given string is an acronym
  * Explanation:
  *   From the start of the string to the end, ("^" to "$")
  *   check if there are at least 2 ("{2,}")
  *   valid acronym characters ("[A-Z&]")
  */
String.prototype.isAcronym = function() {
  return ( /^[A-Z&]{2,}$/ ).test( this );
}

/**
 * Removes all acronyms from an Array of words
 * @param {Array} arr - A list potentially containing acronyms
 * @return {void} - All changes to arr are automatically applied
 */
function removeAcronyms( arr ) {
  for ( let i = arr.length; i >= 0; i-- ) {
    if ( arr[i].isAcronym() ) {
      arr.remove( i );
    }
  }
} // End of removeAcronyms

/**
 * Checks if 2 lookups have any acronyms in common in any way
 * @param {Object} lookup1 - A lookup potentially containing acronyms
 * @param {Object} lookup2 - A lookup potentially containing acronyms
 * @return {boolean} Whether they have any acronyms contained in the other
 */
function shareAnyAcronyms( lookup1, lookup2 ) {
  // They can only have acronyms in common if they both have acronyms
  if ( !Object.hasOwn(lookup1, "acronyms") 
    || !Object.hasOwn(lookup2, "acronyms") ) {  
    return false;
  }

  return lookup1.acronyms.some( (acr) => other.acronyms.includes(acr) );
}

/**
 * Checks if 2 lookups mention the other's phrase or category
 * @param {Object} lookup1 - A lookup Obj
 * @param {Object} lookup2 - The same.
 * @return {boolean} Any mentions?
 */
function containsTheOther( lookup1, lookup2 ) {
  // For each lemma in both lookups, check if they match
  // or are contained in the other.
  for ( let i = 0; i < lookup1.lemmas.length; i++ ) {
    currLemma1 = lookup1.lemmas[ i ];

    for ( let j = 0; j < lookup2.lemmas.length; j++ ) {
      currLemma2 = lookup2.lemmas[ j ];

      if ( currLemma1.includes(currLemma2)
      ||   currLemma2.includes(currLemma1) ) {
        return true;
      }
    }
  }

  // If none matched / were contained
  return false;
}

/**
 * Searches for all first-degree connections between phrases
 * @param {Array} lookups - A list of lookup objects
 * @return {void} - All changes to the objects are automatically applied
 */
function generateConnections( lookups ) {
  
  for (let i = 0; i < lookups.length; i++) {
    const curr = lookups[i];
    const connections = [];

    for (let j = 0; j < lookups.length; j++) {
      // Don't execute on curr
      if (i === j) {
        continue;
      }
      
      const other = lookups[j];

      if ( shareAnyAcronyms(curr, other) || containsTheOther(curr, other) ) {
        connections.push( { "index": j } );
      }
    } // end other loop

    if (connections.length > 0) {
      // Add the actual phrase to each of the connections (for tree view)
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
function calcRelevance( entry ) {
  // Not a true comparison of relevance, but close enough.
  let relevance = entry.lemmas.length;
  
  if ( Object.hasOwn(entry, "acronyms") ) {
    relevance += entry.acronyms.length;
  }
  
  if ( Object.hasOwn(entry, "connections") ) {
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
  for ( let i = 0; i < phraseData.length; i++ ) {
    // Get the current phrase, instantiate object
    const entry = phraseData[ i ];
    const lookupObj = {};

    const lemms = [];
    lemms.push( normalize(entry.phrase) );
    lemms.push( normalize(entry.meaning) );

    // Only if category exists
    if ( Object.hasOwn(entry, "category") ) {
      lemms.push( normalize(entry.category) );
    }

    lookupObj.lemmas = lemms;

    // Add acronyms, if applicable
    if ( Object.hasOwn(entry, "acronyms") ) {
      lookupObj.acronyms = entry.acronyms;
    }

    // Save the index for the connection tree view
    lookupObj.index = i;
    
    lookup.push( lookupObj );
  } // End of for

  // This'll take a while, but I don't know enough
  // big O to tell you just how inefficient it is.
  generateConnections( lookup );

  // Add a relevance score
  for ( let i = 0; i < lookup.length; i++ ) {
    const curr = lookup[ i ];
    curr.relevance = calcRelevance( curr );
  }
  
  // Convert every element to JSON text and print
  const data = lookup.map( (datum) => JSON.stringify(datum) );
  console.log( `[\n  ${ data.join(",\n  ") }\n]` ); // FUNCTION-RELATED LOG. DO NOT DELETE.
} // End of pNPD

/**
 * Finds the index for all occurences of lookup information in a text
 * @param {Object} lookup - The lookup entry you want to check for
 * @param {String} text - Where you want to search for things
 * @return {Array} A list of indices / what was checked as objects
 */
function searchForReferences( lookup, text ) {
  
  const thingsMatched = [];

  let thingsToCheck = [ lookup.lemmas[0] ];
  let hasAcronyms = false;
  let hasCategory = false;

  if ( Object.hasOwn(lookup, "acronyms") ) {
    thingsToCheck = thingsToCheck.concat( lookup.acronyms );
    hasAcronyms = true;
  }
  // If it has a category
  if ( lookup.lemmas.length > 2 ) {
    thingsToCheck.push( lookup.lemmas[2] );
    hasCategory = true;
  }

  // Check if any "thing" appears in the text text.
  // Save the indices and other information.
  for ( let i = 0; i < thingsToCheck.length; i++ ) {
    let currThing = thingsToCheck[ i ];
    let thingLength = currThing.length;

    const thingMatches = {
      "matched": currThing,
      "indices": [],
      "span"   : currThing.length
    }

    // Find all locations of that thing in the text
    let idxOfThing = text.indexOf( currThing );
    while ( idxOfThing > -1 ) {
      thingMatches.indices.push( idxOfThing );

      // Make sure to skip past the occurence just located
      idxOfThing = text.indexOf( currThing, idxOfThing + thingLength );
    }
    
    if ( thingMatches.indices.length > 0 ) {
      thingsMatched.push( thingMatches );
    }
  } // End things loop
  
  return thingsMatched;
}

// **************************************************
// Public
// **************************************************

/**
 * Normalizes the given text, removing capitalization and punctuation
 * @param {String} text
 * @return {String} The normalized text
 */
function normalize( text ) {
  // Remove all punctuation and 's-s
  text = text.replaceAll( /([\[\],.()\/\\\'\"]||\'s)/g, "" );
  
  // Make an array of all the words, without surrounding spaces
  const words = text.split( /\s+/ );
  // Redundancy is key when you don't know what you are doing
  const trimmed = words.map( (each) => each.trim() );

  // Remove capitalization for all words except acronyms
  const normalized = trimmed.map( (word) => {
    if ( !word.isAcronym() ) { return word.toLowerCase(); }
    else { return word; }
  } );

  // Return the line, a string once more
  return normalized.join(" ").trim();
}

/**
 * Fetches a phrase at the given position from lookup
 * @param {int} index - The index of the phrase to be fetched in lookup.json (NOT index attr)
 * @return {Object} - The lookup object at that index
 */
function fetchLookup( index ) {
  return lookupData[ index ];
}

/**
 * Fetches a phrase at the given position from phrases
 * @param {int} index - The index of the phrase to be fetched in phrases.json 
 * @return {Object} - The phrase object at that index
 */
function fetchPhrase( index ) {
  return phraseData[ index ];
}

/**
 * Finds all matching phrases in the database
 * @param {string} text - The normalized text to be parsed for phrases
 * @return {Array} - A list of match objects, set up as follows
 *   lookup: The matched phrase in lookup.json
 *   locations: A list of objects
 *     index: the starting index of the match in text
 *     span: how many letters the match covers
 */
function findMatches( text ) {
  
  const matches = [];

  // For each lookup,
  for (let lookupIdx = 0; lookupIdx < lookupData.length; lookupIdx++) {
    const currLookup = lookupData[ lookupIdx ];

    const locations = [];

    // Find all occurences of lookup information
    let matchBatch = searchForReferences( currLookup, text );
    
    // Save each occurence as a separate location
    for ( let matchIdx = 0; matchIdx < matchBatch.length; matchIdx++ ) {
      let currMatch = matchBatch[ matchIdx ];

      // Loop through all indices to save individually
      for ( let i = 0; i < currMatch.indices.length; i++ ) {
        locations.push( {
          "index": currMatch.indices[ i ],
          "span" : currMatch.span
        } );
      }
    }
    
    if ( locations.length > 0 ) {
      matches.push( {
        "lookup": currLookup,
        "locations": locations
      } );
    }
  } // End lookup loop

  // console.log( "nDNormalized Text: " + text );

  return matches;
} // End findMatches

export default {
  "phrasesLength": phraseData.length,
  "lookupLength" : lookupData.length,
  printNormalizedPhraseData,          // Used for setup
  fetchPhrase,
  fetchLookup,
  normalize,
  findMatches,
};
