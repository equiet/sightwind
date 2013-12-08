<?php

require("PHP-OpenMeteoData/openmeteodata.class.php");
date_default_timezone_set('GMT');
ini_set('memory_limit', '1024M');

$OMD = new OpenMeteoData();

$OMD->setDomain('eu12');

echo '// ' . date('Ym') . str_pad(intval(date('d')), 2, '0', STR_PAD_LEFT) . '12' . "\n\n";
$OMD->setRun(date('Ym') . str_pad(intval(date('d')), 2, '0', STR_PAD_LEFT) . '12');
// $OMD->setRun($_GET['run']);


function roundVal($val) {
	return round($val, 1);
}


$level = 1;


/**
 * Wind at selected altitude
 */

echo "var data_wind_u = [\n";

	$data = $OMD->getArray('wind10m_u', 1);
	foreach ($data /* [$level] */ as $row) {
		echo '[';
			echo implode(array_map('roundVal', $row), ',');
		echo ']' . ",\n";
	}

echo "];\n";
echo "var data_wind_v = [\n";

	$data = $OMD->getArray('wind10m_v', 1);
	foreach ($data /* [$level] */ as $row) {
		echo '[';
			echo implode(array_map('roundVal', $row), ',');
		echo ']' . ",\n";
	}

echo "];\n";


/**
 * Temperature at selected altitude
 */

echo "var data_temp = [\n";

	$data = $OMD->getArray('temp2m', 1);
	foreach ($data /* [$level] */ as $row) {
		echo '[';
			echo implode(array_map('round', $row), ',');
		echo ']' . ",\n";
	}

echo "];\n";


/**
 * Latitude
 */

echo "var lat = [\n";
	$lat = $OMD->getArray('lat', 1);
	foreach ($lat as $row) {
		echo '[' . implode($row, ',') . ']' . ",\n";
	}
echo "];\n";

/**
 * Longitude
 */

echo "var lon = [\n";
	$lon = $OMD->getArray('lon', 1);
	foreach ($lon as $row) {
		echo '[' . implode($row, ',') . ']' . ",\n";
	}
echo "];\n";



/**
 * General data
 */

?>
	var data_meta = {
		topLeft: [
			<?php echo $lon[0][count($lat[0]) - 1]; ?>,
			<?php echo $lat[0][count($lat[0]) - 1]; ?>
		],
		topRight: [
			<?php echo $lon[count($lat) - 1][count($lat[0]) - 1]; ?>,
			<?php echo $lat[count($lat) - 1][count($lat[0]) - 1]; ?>
		],
		bottomLeft: [
			<?php echo $lon[0][0]; ?>,
			<?php echo $lat[0][0]; ?>
		],
		bottomRight: [
			<?php echo $lon[count($lat) - 1][0]; ?>,
			<?php echo $lat[count($lat) - 1][0]; ?>
		]
	};
<?php
