
// For using REST API (Bug reporting and eventually RequireJS replacement)
import { Octokit } from "https://esm.sh/octokit";
const octokit = new Octokit({  });

requirejs.config({
  //By default load any module IDs from js/lib
  baseUrl: "scripts/lib",
  // ../ is a shorthand for parent directory, used to override baseUrl
  paths: {
    app: "../app",
    src: "../src",
    lemmatizer: "lemmatizer-v0.0.2",
    underscore: "underscore-umd-min",
    jquery: "jquery-3.7.1.min",
    json: "require/json",
    text: "require/text"
  }
});

// Start the main app logic.
requirejs(["jquery", "app/phrases"],
function (  $,        phrases ) {
  
  function addRow(event) {
    // Create the row
    const newRow = $("<div></div>").attr("class", "row");
    let entries = [];
    
    // If addRow was called by an entry
    if (event !== null && $(event.target).hasClass("entry")) {
      // Make the clicked entry the only one, and highlighted
      const entry = $(event.target);
      
      entry.css("outline", "2px solid green");
      entry.siblings().remove();

      // Remove all following rows if there are any
      if (entry.parent().nextAll().length !== 0) {
        // Slide each up then delete it
        entry.parent().nextAll().each( function() {
          $(this).empty(); // Removes all children from this & .data cache
          $(this).remove();
        }); // End .nextAll
      } // End row removal

      // Save each connection as a full lookup object
      entries = expandConnections( entry.data().lookup );
    } // End entry-call operations
    
    $("#canvas").append(newRow);
    
    for (let i = 0; i < entries.length; i++) {
      addEntry( entries[i] );
    }
  } // End addRow

  function expandConnections(entry) {
    if ( !Object.hasOwn(entry, "connections") ) {
      return;
    }

    const full = [];
    const connections = entry.connections;
    for (let i = 0; i < connections.length; i++) {
      const lookup = phrases.fetchLookup( connections[i].index );
      full.push(lookup);
    }

    return full;
  }
  
  function addEntry(lookupObj) {
    // Add a row if there aren't any already
    if ($(".row").length === 0) {
      addRow(null);
    }

    if ( Object.hasOwn(lookupObj, "isDocGenerated") ) {
      // Create the entry with the class entry AND doc-generated
      const newEntry = $("<div></div>").addClass("entry doc-generated");
      newEntry.text( "Annotation" );
      newEntry.data("lookup", lookupObj);
      $(".row").last().append(newEntry);
    } else if ( notIncluded(lookupObj) ) {
      // Create the entry
      const newEntry = $("<div></div>").attr("class", "entry");
      const real = phrases.fetch( lookupObj.index );
      newEntry.text( real.phrase );
      newEntry.data( "lookup", lookupObj );
      $(".row").last().append(newEntry);
    } // End canvas check for entry
  } // End addEntry

  function notIncluded(lookupObj) {
    const realPhrase = phrases.fetch( lookupObj.index ).phrase;
    let included = false;

    $(".entry").each( function() {
      if ( $(this).hasClass("doc-generated") ) {
        return; // Non-false return acts as continue
      }

      const thisPhrase = $(this).text();

      if ( realPhrase.valueOf() == thisPhrase.valueOf() ) {
        included = true;
        return false; // Break out of .each loop
      }
    });
    
    return (!included);
  }
  
  function displayPhrase( phraseObj ) {
    $("#def-tbl").css("display", "grid");

    if ( Object.hasOwn(phraseObj, "category") ) {
      addCategory(phraseObj.category);

      $("#def-tbl-phrase").css("grid-row", "3 / span 1");
    } else {
      $("#def-tbl-cat").remove();

      $("#def-tbl-phrase").css("grid-row", "2 / span 2");
    }

    $("#def-tbl-phrase").text( phraseObj.phrase );

    $("#def-tbl-def").text( phraseObj.meaning );
  }

  function addCategory( cat ) {
    const category = $("<div></div>").attr("id", "def-tbl-cat");
    category.text( cat );
    
    $("#def-tbl").append(category);
  }

  function annotateText( text ) {
    if ( text.length === 0 ) {
      return;
    }

    // TODO: Update findMatches to only report the largest
    // matched phrase at a given index (No overlaps)
    // Returns a list of match objects. "locations" contains index/span
    // objects of the match, and "lookup" the lookup obj from lookup.json
    const matches = phrases.findMatches( text );
    
    const splitText = text.split(/[\s]+/g);

    // For every match
    for (let i = 0; i < matches.length; i++) {
      const match = matches[ i ];
      
      // For every matched index/span
      for ( let j = 0; j < match.locations.length; j++ ) {
        const index = match.locations[ j ].index;
        const span = match.locations[ j ].span;

        // TODO: Annotate as one
        // Annotate all words in the span individually
        for (let k = index; k < index + span; k++) {
          splitText[k] = annotate(splitText[k], match.lookup);
        }
      } // End matchedIndices loop
    } // End match loop

    // Make sure nothing is in there when the appending begins
    $("#doc-text").empty();

    for (let i = 0; i < splitText.length; i++) {
      $("#doc-text").append( splitText[i] );

      if ( i !== splitText.length - 1 ) {
        // Kinda important to include these
        // Glad I did the first time...
        $("#doc-text").append(" ");
      }
    }
  } // End annotateText
  
  function annotate(thing, lookupObj) {
    // If it has already been annotated, add another
    if ( typeof thing === "object" ) {
      thing.data().phrases.push(lookupObj);
      
      return thing;
    } else if ( typeof thing === "string" ) {
      const annotation = $("<span></span>").attr("class", "annotation");
      annotation.text( thing );
      // Initialize the list of phrases in data
      annotation.data().phrases = [];
      // Save the phrase object in said
      annotation.data().phrases.push(lookupObj);

      return annotation;
    }
  } // End annotate

  // Allows users to submit bug reports
  async function createIssue() {
    await octokit.rest.issues.create({
      owner: "TallishHobbit",
      repo: "smplfy",
      title: "Hello, world!",
      body: "I created this issue using Octokit!"
    });

    console.log( "Generic issue created!" );
  }

  // When the document has loaded, add event listeners
  $(document).ready( function() {

    // For setup
    // phrases.printNormalizedPhraseData();

    // Create a generic issue (TESTING, TO BE REMOVED)
    createIssue();

    $("#canvas").on("click", ".entry", function( event ) {
      addRow( event );
      
      const entry = $(event.target);
      if ( !entry.hasClass("doc-generated") ) {
        const index = entry.data().lookup.index;
        const phraseData = phrases.fetch( index );
        displayPhrase( phraseData );
      }

      return;
    });

    $("#doc-text").on("click", ".annotation", function( event ) {
      // Out of utmost caution, I am emptying each row individually
      // before deleting it, to prevent data cache issues
      if ( $("#canvas").children().length !== 0 ) {
        $("#canvas").children().each( function() {
          $(this).empty(); // Removes all children from this & .data cache
          $(this).remove();
        }); // End .each
      } // End row removal
      $("#canvas").empty(); // I do NOT want to fix another memory issue
      
      // Create an entry with all relevant match data
      // so that the user can repopulate the next row as needed
      const annotationEntry = {
        "isDocGenerated": true,
        "connections": []
      };
      // Add all the matches to the entry
      const spanEl = $(event.target);
      const matches = spanEl.data().phrases;
      for (let i = 0; i < matches.length; i++) {
        annotationEntry.connections.push( matches[i] );
      }
      addEntry( annotationEntry );

      // Hide the definition table
      $("#def-tbl").css("display", "none");

      return;
    }); // End of #doc-text .annotation

    $("#input-btns").on("click", "#paste-btn", function() {
      if ( $("#doc-text").attr("contenteditable").valueOf() == "true" ) {
        navigator.clipboard
          .readText()  // Returns Promise
          .then(
            (txt) => { 
              const oldText = $("#doc-text").text();
              $("#doc-text").text( oldText + txt ); 
              return;
            }
          );
      }

      return;
    }); // End of #input-btns #paste-btn

    $("#input-btns").on("click", "#clear-btn", function() {
      if ( $("#doc-text").attr("contenteditable").valueOf() == "false" ) {
        $("#doc-text").attr("contenteditable", "true");
      }
      
      // Remove all text / markup
      $("#doc-text").empty();

      return;
    }); // End of #input-btns #clear-btn

    $("#input-btns").on("click", "#submit-btn", function() {
      if ( $("#doc-text").attr("contenteditable").valueOf() == "true" 
      && $("#doc-text").text().length !== 0 ) {
        // Disable text input
        $("#doc-text").attr("contenteditable", "false");

        annotateText( $("#doc-text").text() );
      }

      return;
    }); // End of #input-btns #paste-btn
  }); // End of document/ready
}); // End of main logic
