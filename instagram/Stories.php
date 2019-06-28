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
    $reel = $ig->story->getUserStoryFeed($userId)->getReel();

    if ($reel === null) {
        continue;
    }

    foreach($reel->getItems() as $item) {
        $media_type = $item->getMediaType();
        $mediaUrl = null;

        $dataCompiled = [
            'user_id' => $userId,
            'user_name' => $item->getUser()->getUsername(),
            'user_avatar' => $item->getUser()->getProfilePicUrl(),
            'entry_id' => $item->getId(),
            'entry_link_id' => $item->getCode(),
            'entry_text' => $mediaUrl,
            'entry_created_at' => Carbon::createFromTimestamp($item->getTakenAt())->toDateTimeString()
        ];

        // Logic copypasted from Posts, Stories can't possibly have Carousel, right?
        if ($media_type == \InstagramAPI\Response\Model\Item::PHOTO) {
            $dataCompiled['entry_image'] = $item->getImageVersions2()->getCandidates()[0]->getUrl();
        } elseif ($media_type == \InstagramAPI\Response\Model\Item::VIDEO) {
            $dataCompiled['entry_video'] = $item->getVideoVersions()[0]->getUrl();
        } else {
            continue;
        }

        $responses[] = $dataCompiled;

    }

    sleep(1);
}

echo json_encode($responses);