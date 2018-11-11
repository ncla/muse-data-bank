<?php

require __DIR__.'/../vendor/autoload.php';

use Carbon\Carbon;

if (!isset($argv[1])) {
    die('Missing user login in arguments');
}

if (!isset($argv[2])) {
    die('Missing password in arguments');
}

if (!isset($argv[3])) {
    die('Missing list of user IDs in arguments');
}

$ig = new \InstagramAPI\Instagram(false, false, $storageConfig = []);

try {
    $ig->login($argv[1], $argv[2]);
} catch (\Exception $e) {
    echo 'Something went wrong: '.$e->getMessage()."\n";
    exit(0);
}

$ids = explode(',', $argv[3]);

$responses = [];

foreach($ids as $userId) {
    $maxId = null;
    $rankToken = \InstagramAPI\Signatures::generateUUID();

    do {
        $response = $ig->people->getFollowing($userId, $rankToken, null, $maxId);

        foreach ($response->getUsers() as $user) {
            $responses[] = [
                'user_id' => $userId,
                'entry_id' => $user->getPk(),
                'entry_username' => $user->getUsername(),
                'entry_user_avatar' => $user->getProfilePicUrl(),
                'entry_user_fullname' => $user->getFullName()
            ];
        }

        $maxId = $response->getNextMaxId();

        sleep(2);
    } while ($maxId !== null);
}

echo json_encode($responses);