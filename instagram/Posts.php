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
    foreach($ig->timeline->getUserFeed($userId)->getItems() as $item) {
        $media_type = $item->getMediaType();
        $mediaUrl = null;

        // TODO: Handle videos and multiple items in Discord Webhook Embeds
        if ($media_type === \InstagramAPI\Response\Model\Item::ALBUM) {
            $mediaUrl = $item->getCarouselMedia()[0]->getImageVersions2()->getCandidates()[0]->getUrl();
        } elseif ($media_type == \InstagramAPI\Response\Model\Item::PHOTO) {
            $mediaUrl = $item->getImageVersions2()->getCandidates()[0]->getUrl();
        } elseif ($media_type == \InstagramAPI\Response\Model\Item::VIDEO) {
            $mediaUrl = $item->getImageVersions2()->getCandidates()[0]->getUrl();
        }

        $responses[] = [
            'user_id' => $userId,
            'user_name' => $item->getUser()->getUsername(),
            'user_avatar' => $item->getUser()->getProfilePicUrl(),
            'entry_id' => $item->getId(),
            'entry_link_id' => $item->getCode(),
            'entry_text' => ($item->getCaption() === null) ? null : $item->getCaption()->getText(),
            'entry_image' => $mediaUrl,
            'entry_created_at' => Carbon::createFromTimestamp($item->getTakenAt())->toDateTimeString()
        ];
    }

    sleep(1);
}

echo json_encode($responses);