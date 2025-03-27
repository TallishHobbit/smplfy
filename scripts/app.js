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
function (  $,        phrases) {
  
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
          $(this).slideUp(100, $(this).remove);
        });
      } // End row removal

      // Save each connection as a full lookup object
      entries = expandConnections( entry.data().lookup );
    } // End entry-call operations
    
    $("#canvas").append(newRow);
    
    for (let i = 0; i < entries.length; i++) {
      addEntry( entries[i] );
    }
  } // End addRow
  
  function addEntry(lookupObj) {
    // Add a row if there aren't any already
    if ($(".row").length === 0) {
      addRow(null);
    }

    if ( !alreadyIncluded(lookupObj) ) {
      
      // Create the entry
      const newEntry = $("<div></div>").attr("class", "entry");
      const real = phrases.fetch( lookupObj.index );
      newEntry.text( real.phrase );
      newEntry.data( "lookup", lookupObj );
      $(".row").last().append(newEntry);
    } // End canvas check for entry
  } // End addEntry

  function alreadyIncluded(lookupObj) {
    $(".entry").each( function() {
      const info = $(this).data().lookup;

      if ( JSON.stringify(info) === JSON.stringify(lookupObj) ) {
        console.log(JSON.stringify(info));
        console.log(JSON.stringify(lookupObj));
        return true;
      }
    });
    return false;
  }

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

  Array.prototype.remove = function(index) {
    this.splice(index, 1); // Remove 1 element from the arry, starting at index
  }
  
  // When the document has loaded, add event listeners
  $(document).ready(function() {
    addEntry(phrases.mostLikely);
    
    $("#canvas").on("click", ".entry", addRow);
  });
}); // End of main logic
