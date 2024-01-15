#!/usr/bin/env fish

# Generate a SQLite database with random authors and books for testing

# Total number of authors and books to insert
set totalAuthors 1000
set totalBooks 20000
set batchSize 100
set dbPath test-library/metadata.db
set overrwiteDb false

# Override defaults with CLI args
for i in $argv
    if string match -r -- '--help' $i > /dev/null
        echo "Usage: fish tools/generate-db.fish [--authors=1000] [--books=20000] [--batch=100] [--db=test-library/metadata.db] [--overwrite]"
        exit 0
    end

    if string match -r -- '--authors=[0-9]+' $i > /dev/null
        set totalAuthors (string replace --regex -- '.*=([0-9]+)' '$1' $i)
    end
    if string match -r -- '--books=[0-9]+' $i > /dev/null
        set totalBooks (string replace --regex -- '.*=([0-9]+)' '$1' $i)
    end
    if string match -r -- '--batch=[0-9]+' $i > /dev/null
        set batchSize (string replace --regex -- '.*=([0-9]+)' '$1' $i)
    end
    if string match -r -- '--db=.*' $i > /dev/null
        set dbPath (string replace --regex -- '.*=(.*)' '$1' $i)
    end
    if string match -r -- '--overwrite' $i > /dev/null
        set overrwiteDb true
    end
end

# If the user OKs it, delete the database.
if test $overrwiteDb = true 
  echo "Deleting existing database automatically"
  rm $dbPath
else if test -e $dbPath
    if test (uname) = "Darwin"
        set fileSize (stat -f%z $dbPath)
    else
        set fileSize (stat -c%s $dbPath)
    end

    if test $fileSize -gt 0
        set fileSizeMiB (math $fileSize / 1024 / 1024)
        set fileSizeMiBFormatted (printf "%.2f" $fileSizeMiB)
        echo "Database file $dbPath already exists and is $fileSizeMiBFormatted MiB."

        read -l -n 1 confirm --prompt 'set_color red; printf "Overwrite it? [y/N] "; set_color normal;'
        if test -n $confirm; and string match -r -- 'y' $confirm > /dev/null
            rm $dbPath
        else
            echo "Aborting"
            exit 1
        end
        functions --erase handle_sigint
    end
end

# Create DB
diesel migration run --database-url $dbPath

# Drop some unneeded triggers that would make creating this data harder
# (We need to define a title_sort fn, but that can't be done by the CLI, it needs a native extension lib)
sqlite3 $dbPath "DROP TRIGGER IF EXISTS books_insert_trg;"
sqlite3 $dbPath "DROP TRIGGER IF EXISTS books_delete_trg;"

# Instead of deleting & migrating, we'll use an old DB, clear out the data, and reset the settings
# sqlite3 $dbPath "BEGIN; DELETE FROM books_authors_link; DELETE FROM books; DELETE FROM authors; DELETE FROM data; COMMIT;"
# sqlite3 $dbPath "UPDATE sqlite_sequence SET seq = 0 WHERE name = 'books';"
# sqlite3 $dbPath "SELECT count(*) FROM books;"


# Optimize SQLite settings for bulk inserts
sqlite3 $dbPath "PRAGMA synchronous = OFF; PRAGMA journal_mode = MEMORY;" > /dev/null

function randomAuthorName
    set firstNames Albert Richard John David Carl Isaac Galileo Alan Niels Leonhard Enrico Werner Paul Kurt Stephen Stephen David Johannes Gottfried Ada James Isaac Max Bernhard Erwin Stephen Andrew Stephen Wilhelm Konrad
    set lastNames Einstein Feynman von Neumann Hilbert Gauss Newton Galilei Turing Bohr Euler Fermi Heisenberg Dirac Gödel Hawking Hawking Hilbert Kepler Leibniz Lovelace Maxwell Newton Planck Riemann Schrodinger Turing Witten Wolfram Wright Zuse
    set nicknames "The Bear" "Hard-assed" "Mountain Man" "Two-Ton" "The Hammer" "Swashbucklin" "King of All Things" "Robocop" "Empty Eyes" "Brass Balls" "Queen Bee" "Iron Lady" "Firecracker" "Lady Luck" "Valkyrie" "She-Wolf" "Mama Bear" "Nightshade" "Black Widow" "Hellcat"

    echo (random choice $firstNames) \"(random choice $nicknames)\" (random choice $lastNames)
end

function randomBookName
    set prefix A The Some My "Your New"
    set adjective Great Amazing Awesome Incredible Fantastic Wonderful Beautiful
    set project_adjective Programming Gardening Cooking Baking Knitting Sewing Mountaineering Hiking Woodworking Painting Sculpting Carving Writing
    set noun Book Novel Story Tale Manual Guide Tutorial Handbook Encyclopedia Dictionary Almanac Atlas Cookbook

    echo (random choice $prefix) (random choice $adjective) (random choice $project_adjective) (random choice $noun)
end

function newAuthorsBulk -a batchSize -a batchId
  set sqlStatements "BEGIN;"
  set usedNames ""
  for i in (seq 1 $batchSize)
      set expectedId (math \($batchId\*$batchSize\) + $i)
      set randomAuthorName "$(randomAuthorName) $expectedId"
      while contains $randomAuthorName $usedNames
          set randomAuthorName "$(randomAuthorName) $expectedId"
      end
      set usedNames $usedNames $randomAuthorName
      set sqlStatements "$sqlStatements INSERT INTO authors (name, sort) VALUES ('$randomAuthorName', '$randomAuthorName');"
  end
  set sqlStatements "$sqlStatements COMMIT;"

  sqlite3 $dbPath $sqlStatements
end

function newBooksBulk -a batchSize -a totalAuthors -a batchNum
  set sqlStatements "BEGIN;"
  for i in (seq 1 $batchSize)
      set bookIndex (math "($batchNum * $batchSize) + $i")
      set randomBookName (randomBookName)
      set randomAuthorId (random 1 $totalAuthors)
      # Generating real UUIDs is slow; instead, we use the index of this in the overall job, padded with zeroes
      set uuid (printf "%032x" $ookIndex)
      # set uuid (uuidgen)
      set sqlStatements "$sqlStatements INSERT INTO books (title, series_index, author_sort, path, flags, uuid, has_cover, last_modified, timestamp) VALUES ('$randomBookName', 1, 't1', 'default', 1, '$uuid', 1, '2000-01-29 10:00:00+00:00', '2000-1-29 10:00:00+00:00'); INSERT INTO books_authors_link (book, author) VALUES (LAST_INSERT_ROWID(), $randomAuthorId);"
  end
  set sqlStatements "$sqlStatements COMMIT;"
  sqlite3 $dbPath $sqlStatements

  set sqlStatements "BEGIN;"
  for i in (seq 1 $batchSize)
      set bookIndex (math "($batchNum * $batchSize) + $i")
      set sqlStatements "$sqlStatements INSERT INTO data (book, format, uncompressed_size, name) VALUES ($bookIndex, 'TXT', '123456', 't1');"
  end
  set sqlStatements "$sqlStatements COMMIT;"
  sqlite3 $dbPath $sqlStatements
end

echo "Inserting $totalAuthors authors"
echo "(. = 10%)"
set numberOfBatches (math $totalAuthors / $batchSize)

for i in (seq 1 $numberOfBatches)
  newAuthorsBulk $batchSize $i
  printf "."
end
printf "\n"

echo "Inserting $totalBooks books"
set numberOfBatches (math $totalBooks / $batchSize)
set progressStep (math $numberOfBatches / 10) # Calculate 10% of the total

for i in (seq 0 (math $numberOfBatches - 1))
    newBooksBulk $batchSize $totalAuthors $i
    if test (math $i % $progressStep) -eq 0
        printf "."
    end
end
printf "\n"

#sqlite3 $dbPath "INSERT INTO library_id (uuid) VALUES ('"(uuidgen)"');"

# Reset SQLite settings
sqlite3 $dbPath "PRAGMA synchronous = ON; PRAGMA journal_mode = DELETE;" > /dev/null

printf "Database seeded with $(sqlite3 $dbPath 'select count(*) from books;') books\n"
