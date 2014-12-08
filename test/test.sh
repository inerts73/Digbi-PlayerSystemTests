#!/bin/bash
echo "<========================================>"
echo "Init database.."

echo "<========================================>"
echo "Starting tests.."
node ./test/load_tests.js "$1"

exit
