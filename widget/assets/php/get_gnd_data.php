<?php
require_once(__DIR__."/../../init.php");

use \efi\gnt\gnn;
use \efi\gnt\gnn_example;
use \efi\gnt\bigscape_job;
use \efi\gnt\gnd_v2;
use \efi\gnt\direct_gnd_file;
use \efi\gnt\job_factory;
use \efi\gnt\diagram_data_file;
use \efi\training\example_config;


// This is necessary so that the gnd class environment doesn't get clusttered
// with the dependencies that gnn, etc. need.
class gnd_job_factory extends job_factory {
    function __construct($is_example) { $this->is_example = $is_example; }
    public function new_gnn($db, $id) { return $this->is_example !== false ? new gnn_example($db, $id, $this->is_example) : new gnn($db, $id); }
    public function new_gnn_bigscape_job($db, $id) { return new bigscape_job($db, $id, DiagramJob::GNN); }
    public function new_uploaded_bigscape_job($db, $id) { return new bigscape_job($db, $id, DiagramJob::Uploaded); }
    public function new_diagram_data_file($db, $id) { return new diagram_data_file($db, $id); }
    public function new_direct_gnd_file($file) { return new direct_gnd_file($db, $file); }
}


// If this is being run from the command line then we parse the command line parameters and put them into _POST so we can use
// that below.
if (!isset($_SERVER["HTTP_HOST"]))
    parse_str($argv[1], $_GET);

$PARAMS = $_SERVER['REQUEST_METHOD'] === 'POST' ? $_POST : $_GET;
$is_example = example_config::is_example($PARAMS);


$start_time = microtime(true);

$gnd = new gnd_v2($db, $PARAMS, new gnd_job_factory($is_example), $is_example);


if ($gnd->parse_error()) {
    $output = $gnd->create_error_output($gnd->get_error_message());
    echo json_encode($output);
    exit;
}

if ($gnd->check_for_stats())
    $output = $gnd->get_stats();
else
    $output = $gnd->get_arrow_data();

$total_time = microtime(true) - $start_time;
$output["totaltime"] = $total_time;


if (!isset($_SERVER["HTTP_HOST"])) {
    print $output["totaltime"];
    print "\n";
} else {
    echo json_encode($output);
}